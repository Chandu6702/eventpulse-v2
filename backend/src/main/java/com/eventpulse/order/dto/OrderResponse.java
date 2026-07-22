package com.eventpulse.order.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.eventpulse.order.Order;
import com.eventpulse.order.OrderStatus;

public record OrderResponse(
        UUID id,
        UUID eventId,
        String eventTitle,
        OrderStatus status,
        long totalCents,
        String currency,
        Instant expiresAt,
        Instant confirmedAt,
        Instant createdAt,
        List<Item> items) {

    public record Item(UUID ticketTypeId, String name, int quantity, long unitPriceCents) {
    }

    public static OrderResponse from(Order order) {
        return new OrderResponse(
                order.getId(),
                order.getEvent().getId(),
                order.getEvent().getTitle(),
                order.getStatus(),
                order.getTotalCents(),
                order.getCurrency(),
                order.getExpiresAt(),
                order.getConfirmedAt(),
                order.getCreatedAt(),
                order.getItems().stream()
                        .map(item -> new Item(
                                item.getTicketType().getId(),
                                item.getTicketType().getName(),
                                item.getQuantity(),
                                item.getUnitPriceCents()))
                        .toList());
    }
}
