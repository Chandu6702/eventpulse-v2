package com.eventpulse.order;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.stream.IntStream;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import com.eventpulse.AbstractIntegrationTest;
import com.eventpulse.common.exception.ConflictException;
import com.eventpulse.event.Event;
import com.eventpulse.event.EventCategory;
import com.eventpulse.event.EventRepository;
import com.eventpulse.event.TicketType;
import com.eventpulse.event.TicketTypeRepository;
import com.eventpulse.order.dto.CreateOrderRequest;
import com.eventpulse.order.dto.OrderResponse;
import com.eventpulse.ticket.TicketRepository;
import com.eventpulse.user.Role;
import com.eventpulse.user.User;
import com.eventpulse.user.UserRepository;
import com.eventpulse.waitlist.WaitlistEntry;
import com.eventpulse.waitlist.WaitlistRepository;
import com.eventpulse.waitlist.WaitlistService;

/**
 * The tests that justify the architecture: a real PostgreSQL container,
 * really concurrent buyers, and assertions that the inventory invariants
 * hold under load.
 */
class BookingConcurrencyIntegrationTest extends AbstractIntegrationTest {

    private static final int CAPACITY = 10;
    private static final int COMPETING_BUYERS = 20;

    @Autowired
    private OrderService orderService;
    @Autowired
    private WaitlistService waitlistService;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private EventRepository eventRepository;
    @Autowired
    private TicketTypeRepository ticketTypeRepository;
    @Autowired
    private TicketRepository ticketRepository;
    @Autowired
    private WaitlistRepository waitlistRepository;
    @Autowired
    private JdbcTemplate jdbcTemplate;

    private UUID eventId;
    private UUID ticketTypeId;

    @BeforeEach
    void seedEventWithLimitedTickets() {
        User organizer = userRepository.save(new User(
                "Organizer", "org-" + UUID.randomUUID() + "@test.dev", "n/a", Role.ORGANIZER));

        Event event = new Event(
                organizer, "Load Test Live", "Sells out fast", EventCategory.CONCERT,
                "Test Arena", "Hyderabad",
                Instant.now().plus(30, ChronoUnit.DAYS),
                Instant.now().plus(31, ChronoUnit.DAYS));
        TicketType ticketType = new TicketType(event, "General", 50_000, CAPACITY, 2, null, null);
        event.addTicketType(ticketType);
        event.publish();
        eventRepository.save(event);

        eventId = event.getId();
        ticketTypeId = ticketType.getId();
    }

    @Test
    void concurrentBuyersCannotOversell() throws Exception {
        List<User> buyers = createBuyers(COMPETING_BUYERS);

        ExecutorService pool = Executors.newFixedThreadPool(COMPETING_BUYERS);
        long successes = 0;
        try {
            // invokeAll starts everyone as close together as the pool allows —
            // a stampede for 10 tickets by 20 buyers.
            List<Future<Boolean>> results = pool.invokeAll(buyers.stream()
                    .map(buyer -> (Callable<Boolean>) () -> {
                        try {
                            orderService.create(buyer.getId(), null, orderOf(1));
                            return true;
                        } catch (ConflictException e) {
                            return false;
                        }
                    })
                    .toList());
            for (Future<Boolean> result : results) {
                if (result.get()) {
                    successes++;
                }
            }
        } finally {
            pool.shutdownNow();
        }

        // Exactly CAPACITY orders succeed — never one more.
        assertThat(successes).isEqualTo(CAPACITY);

        TicketType after = ticketTypeRepository.findById(ticketTypeId).orElseThrow();
        assertThat(after.getHeld()).isEqualTo(CAPACITY);
        assertThat(after.getSold()).isZero();
        assertThat(after.available()).isZero();
    }

    @Test
    void idempotencyKeyReplayDoesNotHoldInventoryTwice() {
        User buyer = createBuyers(1).getFirst();
        String key = "replay-" + UUID.randomUUID();

        OrderResponse first = orderService.create(buyer.getId(), key, orderOf(2));
        OrderResponse replay = orderService.create(buyer.getId(), key, orderOf(2));

        assertThat(replay.id()).isEqualTo(first.id());
        assertThat(ticketTypeRepository.findById(ticketTypeId).orElseThrow().getHeld()).isEqualTo(2);
    }

    @Test
    void confirmingAnOrderIssuesTicketsAndConvertsHoldToSale() {
        User buyer = createBuyers(1).getFirst();
        OrderResponse pending = orderService.create(buyer.getId(), null, orderOf(2));

        OrderResponse confirmed = orderService.confirm(pending.id(), buyer.getId(), "pay_mock_123");

        assertThat(confirmed.status()).isEqualTo(OrderStatus.CONFIRMED);
        assertThat(ticketRepository.findByOwnerIdOrderByCreatedAtDesc(buyer.getId())).hasSize(2);

        TicketType after = ticketTypeRepository.findById(ticketTypeId).orElseThrow();
        assertThat(after.getSold()).isEqualTo(2);
        assertThat(after.getHeld()).isZero();

        // Confirming again is an idempotent no-op, not a double sale.
        OrderResponse again = orderService.confirm(pending.id(), buyer.getId(), "pay_mock_123");
        assertThat(again.status()).isEqualTo(OrderStatus.CONFIRMED);
        assertThat(ticketTypeRepository.findById(ticketTypeId).orElseThrow().getSold()).isEqualTo(2);
    }

    @Test
    void expiredOrderReleasesInventoryAndPromotesWaitlist() {
        List<User> buyers = createBuyers(6);

        // Five buyers hold everything (capacity 10, two tickets each).
        List<OrderResponse> orders = buyers.subList(0, 5).stream()
                .map(buyer -> orderService.create(buyer.getId(), null, orderOf(2)))
                .toList();
        assertThat(ticketTypeRepository.findById(ticketTypeId).orElseThrow().available()).isZero();

        // A sixth person cannot book — only join the waitlist.
        User waiter = buyers.get(5);
        assertThatThrownBy(() -> orderService.create(waiter.getId(), null, orderOf(1)))
                .isInstanceOf(ConflictException.class);
        waitlistService.join(ticketTypeId, waiter.getId());

        // Push one order's hold past its deadline, then run the expiry path.
        UUID expiring = orders.getFirst().id();
        jdbcTemplate.update(
                "update orders set expires_at = now() - interval '1 minute' where id = ?", expiring);
        orderService.expireIfStillPending(expiring);

        assertThat(orderService.get(expiring, buyers.getFirst().getId()).status())
                .isEqualTo(OrderStatus.EXPIRED);
        assertThat(ticketTypeRepository.findById(ticketTypeId).orElseThrow().available()).isEqualTo(2);

        // The released inventory notified the waiting user.
        WaitlistEntry entry = waitlistRepository
                .findByTicketTypeIdAndUserId(ticketTypeId, waiter.getId()).orElseThrow();
        assertThat(entry.getStatus()).isEqualTo(WaitlistEntry.Status.NOTIFIED);
    }

    private CreateOrderRequest orderOf(int quantity) {
        return new CreateOrderRequest(eventId,
                List.of(new CreateOrderRequest.Item(ticketTypeId, quantity)));
    }

    private List<User> createBuyers(int count) {
        return IntStream.range(0, count)
                .mapToObj(i -> userRepository.save(new User(
                        "Buyer " + i, "buyer-" + UUID.randomUUID() + "@test.dev", "n/a", Role.ATTENDEE)))
                .toList();
    }
}
