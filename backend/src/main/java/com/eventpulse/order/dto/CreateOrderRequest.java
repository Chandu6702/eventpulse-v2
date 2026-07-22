package com.eventpulse.order.dto;

import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

public record CreateOrderRequest(
        @NotNull UUID eventId,
        @NotEmpty @Valid List<Item> items) {

    public record Item(
            @NotNull UUID ticketTypeId,
            @Min(1) @Max(50) int quantity) {
    }
}
