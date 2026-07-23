package com.eventpulse.event;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import com.eventpulse.AbstractIntegrationTest;
import com.eventpulse.common.dto.PageResponse;
import com.eventpulse.event.dto.EventSummaryResponse;
import com.eventpulse.user.Role;
import com.eventpulse.user.User;
import com.eventpulse.user.UserRepository;

/**
 * Covers the public browse path — the endpoint every visitor hits first.
 * Regression guard for the Spring Data JPA 4 change where
 * Specification.allOf rejects null (absent) filters.
 */
class EventCatalogueIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private EventService eventService;
    @Autowired
    private EventRepository eventRepository;
    @Autowired
    private UserRepository userRepository;

    private String title;

    @BeforeEach
    void publishOneEvent() {
        User organizer = userRepository.save(new User(
                "Catalogue Organizer", "cat-" + UUID.randomUUID() + "@test.dev", "n/a", Role.ORGANIZER));

        title = "Browse Test " + UUID.randomUUID();
        Event event = new Event(
                organizer, title, null, EventCategory.MEETUP,
                "Browse Hall", "Chennai",
                Instant.now().plus(10, ChronoUnit.DAYS),
                Instant.now().plus(11, ChronoUnit.DAYS));
        event.addTicketType(new TicketType(event, "Entry", 0, 10, 2, null, null));
        event.publish();
        eventRepository.save(event);
    }

    @Test
    void browseWithNoFiltersReturnsPublishedEvents() {
        PageResponse<EventSummaryResponse> page =
                eventService.browse(null, null, null, null, null, 0, 50);

        assertThat(page.content()).extracting(EventSummaryResponse::title).contains(title);
    }

    @Test
    void removingATicketTypeActuallyDeletesIt() {
        User organizer = userRepository.save(new User(
                "Remove Organizer", "rm-" + UUID.randomUUID() + "@test.dev", "n/a", Role.ORGANIZER));

        var draft = eventService.create(organizer.getId(), new com.eventpulse.event.dto.CreateEventRequest(
                "Removable", null, EventCategory.WORKSHOP, null, "Lab", "Pune", null,
                Instant.now().plus(5, ChronoUnit.DAYS), Instant.now().plus(6, ChronoUnit.DAYS)));
        var ticketType = eventService.addTicketType(draft.id(), organizer.getId(),
                new com.eventpulse.event.dto.CreateTicketTypeRequest("Seat", 5000, 10, null, null, null));

        eventService.removeTicketType(draft.id(), organizer.getId(), ticketType.id());

        assertThat(eventService.getDetail(draft.id(), organizer.getId()).ticketTypes()).isEmpty();
    }

    @Test
    void browseWithFiltersMatchesAndExcludes() {
        PageResponse<EventSummaryResponse> match =
                eventService.browse("browse test", "Chennai", EventCategory.MEETUP, null, null, 0, 50);
        assertThat(match.content()).extracting(EventSummaryResponse::title).contains(title);

        PageResponse<EventSummaryResponse> noMatch =
                eventService.browse(null, "Nowhere City", null, null, null, 0, 50);
        assertThat(noMatch.content()).extracting(EventSummaryResponse::title).doesNotContain(title);
    }
}
