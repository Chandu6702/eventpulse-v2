package com.eventpulse.event.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.eventpulse.event.Event;
import com.eventpulse.event.EventCategory;
import com.eventpulse.event.EventStatus;

public record EventDetailResponse(
        UUID id,
        String title,
        String description,
        EventCategory category,
        String venue,
        String city,
        String imageUrl,
        Instant startsAt,
        Instant endsAt,
        EventStatus status,
        String organizerName,
        List<TicketTypeResponse> ticketTypes) {

    public static EventDetailResponse from(Event event) {
        return new EventDetailResponse(
                event.getId(),
                event.getTitle(),
                event.getDescription(),
                event.getCategory(),
                event.getVenue(),
                event.getCity(),
                event.getImageUrl(),
                event.getStartsAt(),
                event.getEndsAt(),
                event.getStatus(),
                event.getOrganizer().getName(),
                event.getTicketTypes().stream().map(TicketTypeResponse::from).toList());
    }
}
