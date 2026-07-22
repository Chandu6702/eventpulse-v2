package com.eventpulse.ticket.dto;

import java.time.Instant;
import java.util.UUID;

import com.eventpulse.ticket.Ticket;
import com.eventpulse.ticket.TicketStatus;

public record TicketResponse(
        UUID id,
        String code,
        UUID eventId,
        String eventTitle,
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
                ticket.getEvent().getVenue(),
                ticket.getEvent().getStartsAt(),
                ticket.getTicketType().getName(),
                ticket.getStatus(),
                ticket.getCheckedInAt());
    }
}
