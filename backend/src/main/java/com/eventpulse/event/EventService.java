package com.eventpulse.event;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Stream;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.eventpulse.common.dto.PageResponse;
import com.eventpulse.common.exception.BadRequestException;
import com.eventpulse.common.exception.ConflictException;
import com.eventpulse.common.exception.ForbiddenException;
import com.eventpulse.common.exception.NotFoundException;
import com.eventpulse.event.dto.CreateEventRequest;
import com.eventpulse.event.dto.CreateTicketTypeRequest;
import com.eventpulse.event.dto.EventDetailResponse;
import com.eventpulse.event.dto.EventSummaryResponse;
import com.eventpulse.event.dto.TicketTypeResponse;
import com.eventpulse.event.dto.UpdateEventRequest;
import com.eventpulse.user.User;
import com.eventpulse.user.UserService;

@Service
public class EventService {

    private static final int MAX_PAGE_SIZE = 50;

    private final EventRepository eventRepository;
    private final TicketTypeRepository ticketTypeRepository;
    private final UserService userService;

    public EventService(
            EventRepository eventRepository,
            TicketTypeRepository ticketTypeRepository,
            UserService userService) {
        this.eventRepository = eventRepository;
        this.ticketTypeRepository = ticketTypeRepository;
        this.userService = userService;
    }

    @Transactional(readOnly = true)
    public PageResponse<EventSummaryResponse> browse(
            String query, String city, EventCategory category,
            Instant from, Instant to, int page, int size) {
        // Absent filters come back as null; Specification.allOf rejects
        // nulls, so drop them before combining.
        Specification<Event> spec = Specification.allOf(
                Stream.of(
                        EventSpecifications.published(),
                        EventSpecifications.textSearch(query),
                        EventSpecifications.inCity(city),
                        EventSpecifications.inCategory(category),
                        EventSpecifications.startsAfter(from),
                        EventSpecifications.startsBefore(to))
                        .filter(Objects::nonNull)
                        .toList());

        Pageable pageable = PageRequest.of(
                Math.max(page, 0),
                Math.clamp(size, 1, MAX_PAGE_SIZE),
                Sort.by("startsAt").ascending());

        return PageResponse.from(eventRepository.findAll(spec, pageable), EventSummaryResponse::from);
    }

    @Transactional(readOnly = true)
    public EventDetailResponse getDetail(UUID eventId, UUID requesterId) {
        Event event = eventRepository.findWithTicketTypesById(eventId)
                .orElseThrow(() -> new NotFoundException("Event not found"));

        // Drafts are only visible to their organizer.
        if (event.getStatus() == EventStatus.DRAFT
                && (requesterId == null || !event.isOwnedBy(requesterId))) {
            throw new NotFoundException("Event not found");
        }
        return EventDetailResponse.from(event);
    }

    @Transactional(readOnly = true)
    public PageResponse<EventSummaryResponse> myEvents(UUID organizerId, int page, int size) {
        Pageable pageable = PageRequest.of(
                Math.max(page, 0),
                Math.clamp(size, 1, MAX_PAGE_SIZE),
                Sort.by("createdAt").descending());
        return PageResponse.from(
                eventRepository.findByOrganizerId(organizerId, pageable), EventSummaryResponse::from);
    }

    @Transactional
    public EventDetailResponse create(UUID organizerId, CreateEventRequest request) {
        validateSchedule(request.startsAt(), request.endsAt());
        User organizer = userService.getById(organizerId);
        Event event = eventRepository.save(new Event(
                organizer,
                request.title().trim(),
                request.description(),
                request.category(),
                request.venue().trim(),
                request.city() == null ? null : request.city().trim(),
                request.startsAt(),
                request.endsAt()));
        return EventDetailResponse.from(event);
    }

    @Transactional
    public EventDetailResponse update(UUID eventId, UUID organizerId, UpdateEventRequest request) {
        Event event = ownedEditableEvent(eventId, organizerId);

        if (request.title() != null) {
            event.setTitle(request.title().trim());
        }
        if (request.description() != null) {
            event.setDescription(request.description());
        }
        if (request.category() != null) {
            event.setCategory(request.category());
        }
        if (request.venue() != null) {
            event.setVenue(request.venue().trim());
        }
        if (request.city() != null) {
            event.setCity(request.city().trim());
        }
        if (request.startsAt() != null) {
            event.setStartsAt(request.startsAt());
        }
        if (request.endsAt() != null) {
            event.setEndsAt(request.endsAt());
        }
        validateSchedule(event.getStartsAt(), event.getEndsAt());
        return EventDetailResponse.from(event);
    }

    @Transactional
    public EventDetailResponse publish(UUID eventId, UUID organizerId) {
        Event event = ownedEvent(eventId, organizerId);
        event.publish();
        return EventDetailResponse.from(event);
    }

    @Transactional
    public EventDetailResponse cancel(UUID eventId, UUID organizerId) {
        Event event = ownedEvent(eventId, organizerId);
        event.cancel();
        return EventDetailResponse.from(event);
    }

    @Transactional
    public TicketTypeResponse addTicketType(UUID eventId, UUID organizerId, CreateTicketTypeRequest request) {
        Event event = ownedEvent(eventId, organizerId);
        if (event.getStatus() == EventStatus.CANCELLED) {
            throw new ConflictException("Cannot add ticket types to a cancelled event");
        }
        if (request.salesStartAt() != null && request.salesEndAt() != null
                && !request.salesStartAt().isBefore(request.salesEndAt())) {
            throw new BadRequestException("salesStartAt must be before salesEndAt");
        }

        TicketType ticketType = new TicketType(
                event,
                request.name().trim(),
                request.priceCents(),
                request.capacity(),
                request.perOrderLimitOrDefault(),
                request.salesStartAt(),
                request.salesEndAt());
        event.addTicketType(ticketType);
        return TicketTypeResponse.from(ticketTypeRepository.save(ticketType));
    }

    @Transactional
    public void removeTicketType(UUID eventId, UUID organizerId, UUID ticketTypeId) {
        Event event = ownedEvent(eventId, organizerId);
        TicketType ticketType = event.getTicketTypes().stream()
                .filter(t -> t.getId().equals(ticketTypeId))
                .findFirst()
                .orElseThrow(() -> new NotFoundException("Ticket type not found"));
        if (ticketType.getSold() > 0 || ticketType.getHeld() > 0) {
            throw new ConflictException("Cannot remove a ticket type that has sold or held tickets");
        }
        // Must go through the parent collection: deleting the child directly
        // is cancelled by the event's cascade while it still references it.
        // orphanRemoval performs the actual delete on flush.
        event.getTicketTypes().remove(ticketType);
    }

    Event ownedEvent(UUID eventId, UUID organizerId) {
        Event event = eventRepository.findWithTicketTypesById(eventId)
                .orElseThrow(() -> new NotFoundException("Event not found"));
        if (!event.isOwnedBy(organizerId)) {
            throw new ForbiddenException("You do not manage this event");
        }
        return event;
    }

    private Event ownedEditableEvent(UUID eventId, UUID organizerId) {
        Event event = ownedEvent(eventId, organizerId);
        if (!event.isEditable()) {
            throw new ConflictException("Only draft events can be edited");
        }
        return event;
    }

    private void validateSchedule(Instant startsAt, Instant endsAt) {
        if (!startsAt.isBefore(endsAt)) {
            throw new BadRequestException("startsAt must be before endsAt");
        }
    }
}
