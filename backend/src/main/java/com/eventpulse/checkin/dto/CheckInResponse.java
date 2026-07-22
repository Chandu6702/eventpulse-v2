package com.eventpulse.checkin.dto;

import java.time.Instant;
import java.util.UUID;

import com.eventpulse.ticket.Ticket;

public record CheckInResponse(
        UUID ticketId,
        String attendeeName,
        String ticketTypeName,
        String eventTitle,
        Instant checkedInAt) {

    public static CheckInResponse from(Ticket ticket) {
        return new CheckInResponse(
                ticket.getId(),
                ticket.getOwner().getName(),
                ticket.getTicketType().getName(),
                ticket.getEvent().getTitle(),
                ticket.getCheckedInAt());
    }
}
