package com.eventpulse.event.dto;

import java.time.Instant;

import com.eventpulse.event.EventCategory;

import org.hibernate.validator.constraints.URL;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateEventRequest(
        @NotBlank @Size(max = 200) String title,
        @Size(max = 10_000) String description,
        @NotNull EventCategory category,
        @NotBlank @Size(max = 200) String venue,
        @Size(max = 100) String city,
        @URL @Size(max = 500) String imageUrl,
        @NotNull @Future Instant startsAt,
        @NotNull @Future Instant endsAt) {
}
