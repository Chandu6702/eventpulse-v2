package com.eventpulse.event;

import java.time.Instant;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.eventpulse.common.dto.PageResponse;
import com.eventpulse.event.dto.CreateEventRequest;
import com.eventpulse.event.dto.CreateTicketTypeRequest;
import com.eventpulse.event.dto.EventDetailResponse;
import com.eventpulse.event.dto.EventSummaryResponse;
import com.eventpulse.event.dto.TicketTypeResponse;
import com.eventpulse.event.dto.UpdateEventRequest;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/events")
public class EventController {

    private final EventService eventService;

    public EventController(EventService eventService) {
        this.eventService = eventService;
    }

    // ---- Public catalogue ----

    @GetMapping
    public PageResponse<EventSummaryResponse> browse(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) EventCategory category,
            @RequestParam(required = false) Instant from,
            @RequestParam(required = false) Instant to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size) {
        return eventService.browse(q, city, category, from, to, page, size);
    }

    @GetMapping("/{eventId}")
    public EventDetailResponse detail(
            @PathVariable UUID eventId,
            @AuthenticationPrincipal Jwt jwt) {
        UUID requesterId = jwt == null ? null : UUID.fromString(jwt.getSubject());
        return eventService.getDetail(eventId, requesterId);
    }

    // ---- Organizer management ----

    @GetMapping("/mine")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    public PageResponse<EventSummaryResponse> myEvents(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size) {
        return eventService.myEvents(UUID.fromString(jwt.getSubject()), page, size);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public EventDetailResponse create(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CreateEventRequest request) {
        return eventService.create(UUID.fromString(jwt.getSubject()), request);
    }

    @PatchMapping("/{eventId}")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    public EventDetailResponse update(
            @PathVariable UUID eventId,
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody UpdateEventRequest request) {
        return eventService.update(eventId, UUID.fromString(jwt.getSubject()), request);
    }

    @PostMapping("/{eventId}/publish")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    public EventDetailResponse publish(
            @PathVariable UUID eventId,
            @AuthenticationPrincipal Jwt jwt) {
        return eventService.publish(eventId, UUID.fromString(jwt.getSubject()));
    }

    @PostMapping("/{eventId}/cancel")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    public EventDetailResponse cancel(
            @PathVariable UUID eventId,
            @AuthenticationPrincipal Jwt jwt) {
        return eventService.cancel(eventId, UUID.fromString(jwt.getSubject()));
    }

    @PostMapping("/{eventId}/ticket-types")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public TicketTypeResponse addTicketType(
            @PathVariable UUID eventId,
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CreateTicketTypeRequest request) {
        return eventService.addTicketType(eventId, UUID.fromString(jwt.getSubject()), request);
    }

    @DeleteMapping("/{eventId}/ticket-types/{ticketTypeId}")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeTicketType(
            @PathVariable UUID eventId,
            @PathVariable UUID ticketTypeId,
            @AuthenticationPrincipal Jwt jwt) {
        eventService.removeTicketType(eventId, UUID.fromString(jwt.getSubject()), ticketTypeId);
    }
}
