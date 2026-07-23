package com.eventpulse.analytics;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class AnalyticsDtos {

    private AnalyticsDtos() {
    }

    public record DailyCount(LocalDate date, long count) {
    }

    public record CategoryCount(String category, long count) {
    }

    public record EventStats(
            UUID eventId,
            String title,
            String status,
            Instant startsAt,
            long capacity,
            long sold,
            long checkedIn,
            long revenueCents,
            long soldLast7Days,
            List<DailyCount> salesPerDay) {
    }

    /** Everything the organizer dashboard needs in one round trip. */
    public record OrganizerAnalytics(
            long totalEvents,
            long ticketsSold,
            long revenueCents,
            long checkedIn,
            List<CategoryCount> categoryBreakdown,
            List<EventStats> events) {
    }

    /** Personal section — every user has one. */
    public record PersonalAnalytics(
            long ticketsBought,
            long spentCents,
            long eventsAttended,
            long upcomingTickets,
            List<CategoryCount> categoryBreakdown) {
    }

    public record Insight(String insight) {
    }
}
