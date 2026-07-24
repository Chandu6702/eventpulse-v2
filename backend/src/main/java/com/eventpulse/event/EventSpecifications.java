package com.eventpulse.event;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;

import org.springframework.data.jpa.domain.Specification;

import jakarta.persistence.criteria.Predicate;

/**
 * Composable filters for the public event catalogue.
 */
public final class EventSpecifications {

    private EventSpecifications() {
    }

    public static Specification<Event> published() {
        return (root, query, cb) -> cb.equal(root.get("status"), EventStatus.PUBLISHED);
    }

    /** One search box covers title, venue, city and category (incl. custom labels). */
    public static Specification<Event> textSearch(String text) {
        if (text == null || text.isBlank()) {
            return null;
        }
        String needle = text.trim().toLowerCase();
        String pattern = "%" + needle + "%";
        List<EventCategory> matchingCategories = Arrays.stream(EventCategory.values())
                .filter(category -> category.name().toLowerCase().contains(needle))
                .toList();
        return (root, query, cb) -> {
            Predicate byText = cb.or(
                    cb.like(cb.lower(root.get("title")), pattern),
                    cb.like(cb.lower(root.get("venue")), pattern),
                    cb.like(cb.lower(root.get("city")), pattern),
                    cb.like(cb.lower(root.get("categoryLabel")), pattern));
            if (matchingCategories.isEmpty()) {
                return byText;
            }
            return cb.or(byText, root.get("category").in(matchingCategories));
        };
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
