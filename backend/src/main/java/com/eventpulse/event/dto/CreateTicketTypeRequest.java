package com.eventpulse.event.dto;

import java.time.Instant;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record CreateTicketTypeRequest(
        @NotBlank @Size(max = 100) String name,
        @PositiveOrZero long priceCents,
        @Min(1) @Max(100_000) int capacity,
        @Min(1) @Max(50) Integer perOrderLimit,
        Instant salesStartAt,
        Instant salesEndAt) {

    public int perOrderLimitOrDefault() {
        return perOrderLimit == null ? 10 : perOrderLimit;
    }
}
