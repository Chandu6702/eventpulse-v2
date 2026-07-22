package com.eventpulse.checkin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import com.eventpulse.AbstractIntegrationTest;
import com.eventpulse.checkin.dto.CheckInResponse;
import com.eventpulse.common.exception.ConflictException;
import com.eventpulse.common.exception.ForbiddenException;
import com.eventpulse.event.Event;
import com.eventpulse.event.EventCategory;
import com.eventpulse.event.EventRepository;
import com.eventpulse.event.TicketType;
import com.eventpulse.order.OrderService;
import com.eventpulse.order.dto.CreateOrderRequest;
import com.eventpulse.order.dto.OrderResponse;
import com.eventpulse.ticket.Ticket;
import com.eventpulse.ticket.TicketRepository;
import com.eventpulse.ticket.TicketStatus;
import com.eventpulse.user.Role;
import com.eventpulse.user.User;
import com.eventpulse.user.UserRepository;

class CheckInIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private CheckInService checkInService;
    @Autowired
    private OrderService orderService;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private EventRepository eventRepository;
    @Autowired
    private TicketRepository ticketRepository;

    private User organizer;
    private User attendee;
    private Ticket ticket;

    @BeforeEach
    void issueOneTicket() {
        organizer = userRepository.save(new User(
                "Gate Owner", "gate-" + UUID.randomUUID() + "@test.dev", "n/a", Role.ORGANIZER));
        attendee = userRepository.save(new User(
                "Visitor", "visitor-" + UUID.randomUUID() + "@test.dev", "n/a", Role.ATTENDEE));

        Event event = new Event(
                organizer, "Check-in Conf", null, EventCategory.CONFERENCE,
                "Hall A", "Bengaluru",
                Instant.now().plus(7, ChronoUnit.DAYS),
                Instant.now().plus(8, ChronoUnit.DAYS));
        TicketType ticketType = new TicketType(event, "Standard", 100_000, 50, 4, null, null);
        event.addTicketType(ticketType);
        event.publish();
        eventRepository.save(event);

        OrderResponse order = orderService.create(attendee.getId(), null,
                new CreateOrderRequest(event.getId(),
                        List.of(new CreateOrderRequest.Item(ticketType.getId(), 1))));
        orderService.confirm(order.id(), attendee.getId(), "pay_mock");

        ticket = ticketRepository.findByOwnerIdOrderByCreatedAtDesc(attendee.getId()).getFirst();
    }

    @Test
    void validTicketChecksInExactlyOnce() {
        CheckInResponse response = checkInService.checkIn(ticket.getCode(), organizer.getId());

        assertThat(response.attendeeName()).isEqualTo("Visitor");
        assertThat(ticketRepository.findById(ticket.getId()).orElseThrow().getStatus())
                .isEqualTo(TicketStatus.CHECKED_IN);

        // The same QR scanned again is rejected with the original scan time.
        assertThatThrownBy(() -> checkInService.checkIn(ticket.getCode(), organizer.getId()))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("already checked in");
    }

    @Test
    void onlyTheEventsOrganizerCanScan() {
        User otherOrganizer = userRepository.save(new User(
                "Someone Else", "other-" + UUID.randomUUID() + "@test.dev", "n/a", Role.ORGANIZER));

        assertThatThrownBy(() -> checkInService.checkIn(ticket.getCode(), otherOrganizer.getId()))
                .isInstanceOf(ForbiddenException.class);
    }
}
