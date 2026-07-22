package com.eventpulse.waitlist.dto;

import java.time.Instant;
import java.util.UUID;

import com.eventpulse.waitlist.WaitlistEntry;

public record WaitlistEntryResponse(
        UUID id,
        UUID ticketTypeId,
        String ticketTypeName,
        String eventTitle,
        WaitlistEntry.Status status,
        long peopleAhead,
        Instant createdAt,
        Instant notifiedAt) {

    public static WaitlistEntryResponse from(WaitlistEntry entry, long peopleAhead) {
        return new WaitlistEntryResponse(
                entry.getId(),
                entry.getTicketType().getId(),
                entry.getTicketType().getName(),
                entry.getTicketType().getEvent().getTitle(),
                entry.getStatus(),
                peopleAhead,
                entry.getCreatedAt(),
                entry.getNotifiedAt());
    }
}
