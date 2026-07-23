package com.eventpulse.event.dto;

import java.time.Instant;

import com.eventpulse.event.EventCategory;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Partial update — null fields are left unchanged.
 */
public record UpdateEventRequest(
        @Size(max = 200) String title,
        @Size(max = 10_000) String description,
        EventCategory category,
        @Size(max = 50) String categoryLabel,
        @Size(max = 200) String venue,
        @Size(max = 100) String city,
        @Pattern(regexp = "^(https?://|data:image/).+", message = "must be an http(s) URL or an image data URL")
        @Size(max = 500_000, message = "image is too large — keep it under ~350 KB")
        String imageUrl,
        Instant startsAt,
        Instant endsAt) {
}
