package com.eventpulse.order;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.eventpulse.common.dto.PageResponse;
import com.eventpulse.common.exception.BadRequestException;
import com.eventpulse.common.exception.ConflictException;
import com.eventpulse.common.exception.ForbiddenException;
import com.eventpulse.common.exception.NotFoundException;
import com.eventpulse.config.BookingProperties;
import com.eventpulse.event.Event;
import com.eventpulse.event.EventRepository;
import com.eventpulse.event.EventStatus;
import com.eventpulse.event.TicketType;
import com.eventpulse.event.TicketTypeRepository;
import com.eventpulse.order.dto.CreateOrderRequest;
import com.eventpulse.order.dto.OrderResponse;
import com.eventpulse.ticket.Ticket;
import com.eventpulse.ticket.TicketRepository;
import com.eventpulse.user.User;
import com.eventpulse.user.UserService;
import com.eventpulse.waitlist.WaitlistService;

/**
 * The booking engine. Oversell prevention rests on two layers:
 *
 * 1. {@code tryHold} — a conditional UPDATE that only succeeds when enough
 *    inventory exists at the exact moment the row is written.
 * 2. A CHECK constraint on ticket_types as the database-level backstop.
 *
 * A pending order holds inventory until it is confirmed, cancelled, or the
 * expiry job releases it.
 */
@Service
public class OrderService {

    private static final Logger log = LoggerFactory.getLogger(OrderService.class);

    private final OrderRepository orderRepository;
    private final EventRepository eventRepository;
    private final TicketTypeRepository ticketTypeRepository;
    private final TicketRepository ticketRepository;
    private final UserService userService;
    private final WaitlistService waitlistService;
    private final BookingProperties bookingProperties;
    private final SecureRandom secureRandom = new SecureRandom();

    public OrderService(
            OrderRepository orderRepository,
            EventRepository eventRepository,
            TicketTypeRepository ticketTypeRepository,
            TicketRepository ticketRepository,
            UserService userService,
            WaitlistService waitlistService,
            BookingProperties bookingProperties) {
        this.orderRepository = orderRepository;
        this.eventRepository = eventRepository;
        this.ticketTypeRepository = ticketTypeRepository;
        this.ticketRepository = ticketRepository;
        this.userService = userService;
        this.waitlistService = waitlistService;
        this.bookingProperties = bookingProperties;
    }

    @Transactional
    public OrderResponse create(UUID userId, String idempotencyKey, CreateOrderRequest request) {
        // Idempotent replay: the same key returns the original order instead
        // of holding inventory twice.
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            Optional<Order> existing = orderRepository.findByUserIdAndIdempotencyKey(userId, idempotencyKey);
            if (existing.isPresent()) {
                return OrderResponse.from(existing.get());
            }
        }

        Event event = eventRepository.findWithTicketTypesById(request.eventId())
                .orElseThrow(() -> new NotFoundException("Event not found"));
        if (event.getStatus() != EventStatus.PUBLISHED) {
            throw new ConflictException("Tickets can only be booked for published events");
        }

        Map<UUID, TicketType> byId = event.getTicketTypes().stream()
                .collect(Collectors.toMap(TicketType::getId, Function.identity()));

        List<CreateOrderRequest.Item> items = normalize(request.items());
        Instant now = Instant.now();

        User user = userService.getById(userId);
        Order order = new Order(
                user, event,
                (idempotencyKey == null || idempotencyKey.isBlank()) ? null : idempotencyKey,
                now.plus(bookingProperties.holdDuration()),
                "INR");

        for (CreateOrderRequest.Item item : items) {
            TicketType ticketType = byId.get(item.ticketTypeId());
            if (ticketType == null) {
                throw new BadRequestException("Ticket type does not belong to this event");
            }
            if (!ticketType.isOnSale(now)) {
                throw new ConflictException("'%s' is not on sale".formatted(ticketType.getName()));
            }
            if (item.quantity() > ticketType.getPerOrderLimit()) {
                throw new BadRequestException(
                        "Maximum %d tickets of '%s' per order"
                                .formatted(ticketType.getPerOrderLimit(), ticketType.getName()));
            }

            // The write is the check: this UPDATE only succeeds when enough
            // inventory is available at that instant. On failure the whole
            // transaction rolls back, releasing any holds taken above.
            if (ticketTypeRepository.tryHold(ticketType.getId(), item.quantity()) == 0) {
                throw new ConflictException(
                        "Not enough '%s' tickets available".formatted(ticketType.getName()));
            }
            order.addItem(new OrderItem(order, ticketType, item.quantity(), ticketType.getPriceCents()));
        }

        return OrderResponse.from(orderRepository.save(order));
    }

    @Transactional
    public OrderResponse confirm(UUID orderId, UUID userId, String paymentReference) {
        Order order = ownedOrderForUpdate(orderId, userId);

        if (order.getStatus() == OrderStatus.CONFIRMED) {
            return OrderResponse.from(order); // idempotent confirm
        }
        if (order.getStatus() != OrderStatus.PENDING) {
            throw new ConflictException("Order is " + order.getStatus().name().toLowerCase());
        }
        if (order.isExpired(Instant.now())) {
            throw new ConflictException("Order hold has expired");
        }

        for (OrderItem item : sortedByTicketType(order)) {
            if (ticketTypeRepository.confirmHold(item.getTicketType().getId(), item.getQuantity()) == 0) {
                // Should be impossible while the order row is locked; abort loudly.
                throw new IllegalStateException("Hold missing for order " + orderId);
            }
        }

        for (OrderItem item : order.getItems()) {
            for (int i = 0; i < item.getQuantity(); i++) {
                ticketRepository.save(new Ticket(order, item.getTicketType(), order.getUser(), ticketCode()));
            }
        }

        order.markConfirmed(paymentReference);
        return OrderResponse.from(order);
    }

    @Transactional
    public OrderResponse cancel(UUID orderId, UUID userId) {
        Order order = ownedOrderForUpdate(orderId, userId);
        if (order.getStatus() != OrderStatus.PENDING) {
            throw new ConflictException("Only pending orders can be cancelled");
        }
        releaseHolds(order);
        order.setStatus(OrderStatus.CANCELLED);
        return OrderResponse.from(order);
    }

    /**
     * Called by the expiry job. Re-checks state under the row lock so a
     * confirm that slipped in between scan and lock wins the race cleanly.
     */
    @Transactional
    public void expireIfStillPending(UUID orderId) {
        Order order = orderRepository.findByIdForUpdate(orderId).orElse(null);
        if (order == null || !order.isExpired(Instant.now())) {
            return;
        }
        releaseHolds(order);
        order.setStatus(OrderStatus.EXPIRED);
        log.info("Expired order {} and released its holds", orderId);
    }

    @Transactional(readOnly = true)
    public PageResponse<OrderResponse> myOrders(UUID userId, int page, int size) {
        return PageResponse.from(
                orderRepository.findByUserId(userId, PageRequest.of(
                        Math.max(page, 0), Math.clamp(size, 1, 50),
                        Sort.by("createdAt").descending())),
                OrderResponse::from);
    }

    @Transactional(readOnly = true)
    public OrderResponse get(UUID orderId, UUID userId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new NotFoundException("Order not found"));
        if (!order.getUser().getId().equals(userId)) {
            throw new ForbiddenException("Not your order");
        }
        return OrderResponse.from(order);
    }

    private void releaseHolds(Order order) {
        for (OrderItem item : sortedByTicketType(order)) {
            ticketTypeRepository.releaseHold(item.getTicketType().getId(), item.getQuantity());
            waitlistService.notifyInventoryReleased(item.getTicketType().getId());
        }
    }

    private Order ownedOrderForUpdate(UUID orderId, UUID userId) {
        Order order = orderRepository.findByIdForUpdate(orderId)
                .orElseThrow(() -> new NotFoundException("Order not found"));
        if (!order.getUser().getId().equals(userId)) {
            throw new ForbiddenException("Not your order");
        }
        return order;
    }

    /**
     * Merges duplicate ticket types and fixes the processing order so every
     * transaction touches ticket_type rows in the same sequence — the
     * classic deadlock-avoidance trick.
     */
    private List<CreateOrderRequest.Item> normalize(List<CreateOrderRequest.Item> items) {
        return items.stream()
                .collect(Collectors.groupingBy(CreateOrderRequest.Item::ticketTypeId,
                        Collectors.summingInt(CreateOrderRequest.Item::quantity)))
                .entrySet().stream()
                .map(entry -> new CreateOrderRequest.Item(entry.getKey(), entry.getValue()))
                .sorted(Comparator.comparing(CreateOrderRequest.Item::ticketTypeId))
                .toList();
    }

    private List<OrderItem> sortedByTicketType(Order order) {
        return order.getItems().stream()
                .sorted(Comparator.comparing(item -> item.getTicketType().getId()))
                .toList();
    }

    private String ticketCode() {
        byte[] bytes = new byte[24];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
