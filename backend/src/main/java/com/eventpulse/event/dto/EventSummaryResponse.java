package com.eventpulse.event.dto;

import java.time.Instant;
import java.util.UUID;

import com.eventpulse.event.Event;
import com.eventpulse.event.EventCategory;
import com.eventpulse.event.EventStatus;

public record EventSummaryResponse(
        UUID id,
        String title,
        EventCategory category,
        String venue,
        String city,
        String imageUrl,
        Instant startsAt,
        Instant endsAt,
        EventStatus status) {

    public static EventSummaryResponse from(Event event) {
        return new EventSummaryResponse(
                event.getId(),
                event.getTitle(),
                event.getCategory(),
                event.getVenue(),
                event.getCity(),
                event.getImageUrl(),
                event.getStartsAt(),
                event.getEndsAt(),
                event.getStatus());
    }
}
