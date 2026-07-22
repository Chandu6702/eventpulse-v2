package com.eventpulse.event;

import java.time.Instant;

import org.springframework.data.jpa.domain.Specification;

/**
 * Composable filters for the public event catalogue.
 */
public final class EventSpecifications {

    private EventSpecifications() {
    }

    public static Specification<Event> published() {
        return (root, query, cb) -> cb.equal(root.get("status"), EventStatus.PUBLISHED);
    }

    public static Specification<Event> textSearch(String text) {
        if (text == null || text.isBlank()) {
            return null;
        }
        String pattern = "%" + text.trim().toLowerCase() + "%";
        return (root, query, cb) -> cb.or(
                cb.like(cb.lower(root.get("title")), pattern),
                cb.like(cb.lower(root.get("venue")), pattern));
    }

    public static Specification<Event> inCity(String city) {
        if (city == null || city.isBlank()) {
            return null;
        }
        return (root, query, cb) -> cb.equal(cb.lower(root.get("city")), city.trim().toLowerCase());
    }

    public static Specification<Event> inCategory(EventCategory category) {
        if (category == null) {
            return null;
        }
        return (root, query, cb) -> cb.equal(root.get("category"), category);
    }

    public static Specification<Event> startsAfter(Instant from) {
        if (from == null) {
            return null;
        }
        return (root, query, cb) -> cb.greaterThanOrEqualTo(root.get("startsAt"), from);
    }

    public static Specification<Event> startsBefore(Instant to) {
        if (to == null) {
            return null;
        }
        return (root, query, cb) -> cb.lessThanOrEqualTo(root.get("startsAt"), to);
    }
}
