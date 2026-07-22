package com.eventpulse.event.dto;

import java.time.Instant;

import com.eventpulse.event.EventCategory;

import jakarta.validation.constraints.Size;

/**
 * Partial update — null fields are left unchanged.
 */
public record UpdateEventRequest(
        @Size(max = 200) String title,
        @Size(max = 10_000) String description,
        EventCategory category,
        @Size(max = 200) String venue,
        @Size(max = 100) String city,
        Instant startsAt,
        Instant endsAt) {
}
