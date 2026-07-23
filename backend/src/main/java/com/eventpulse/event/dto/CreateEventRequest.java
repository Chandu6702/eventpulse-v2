package com.eventpulse.event.dto;

import java.time.Instant;

import com.eventpulse.event.EventCategory;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateEventRequest(
        @NotBlank @Size(max = 200) String title,
        @Size(max = 10_000) String description,
        @NotNull EventCategory category,
        @Size(max = 50) String categoryLabel,
        @NotBlank @Size(max = 200) String venue,
        @Size(max = 100) String city,
        // Either a link or a browser-compressed inline image (data URL).
        @Pattern(regexp = "^(https?://|data:image/).+", message = "must be an http(s) URL or an image data URL")
        @Size(max = 500_000, message = "image is too large — keep it under ~350 KB")
        String imageUrl,
        @NotNull @Future Instant startsAt,
        @NotNull @Future Instant endsAt) {
}
