package com.eventpulse.ticket.dto;

import java.time.Instant;
import java.util.UUID;

import com.eventpulse.event.EventStatus;
import com.eventpulse.ticket.Ticket;
import com.eventpulse.ticket.TicketStatus;

public record TicketResponse(
        UUID id,
        String code,
        UUID eventId,
        String eventTitle,
        /** So the client can explain a voided ticket for a cancelled event. */
        EventStatus eventStatus,
        String venue,
        Instant startsAt,
        String ticketTypeName,
        TicketStatus status,
        Instant checkedInAt) {

    public static TicketResponse from(Ticket ticket) {
        return new TicketResponse(
                ticket.getId(),
                ticket.getCode(),
                ticket.getEvent().getId(),
                ticket.getEvent().getTitle(),
                ticket.getEvent().getStatus(),
                ticket.getEvent().getVenue(),
                ticket.getEvent().getStartsAt(),
                ticket.getTicketType().getName(),
                ticket.getStatus(),
                ticket.getCheckedInAt());
    }
}
