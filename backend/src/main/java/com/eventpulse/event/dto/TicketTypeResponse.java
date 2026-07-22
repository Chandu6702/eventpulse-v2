package com.eventpulse.event.dto;

import java.time.Instant;
import java.util.UUID;

import com.eventpulse.event.TicketType;

public record TicketTypeResponse(
        UUID id,
        String name,
        long priceCents,
        String currency,
        int capacity,
        int available,
        int perOrderLimit,
        Instant salesStartAt,
        Instant salesEndAt,
        boolean onSale) {

    public static TicketTypeResponse from(TicketType ticketType) {
        return new TicketTypeResponse(
                ticketType.getId(),
                ticketType.getName(),
                ticketType.getPriceCents(),
                ticketType.getCurrency(),
                ticketType.getCapacity(),
                ticketType.available(),
                ticketType.getPerOrderLimit(),
                ticketType.getSalesStartAt(),
                ticketType.getSalesEndAt(),
                ticketType.isOnSale(Instant.now()));
    }
}
