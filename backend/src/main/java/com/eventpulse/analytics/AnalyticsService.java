package com.eventpulse.analytics;

import java.sql.Date;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.eventpulse.analytics.AnalyticsDtos.CategoryCount;
import com.eventpulse.analytics.AnalyticsDtos.DailyCount;
import com.eventpulse.analytics.AnalyticsDtos.EventStats;
import com.eventpulse.analytics.AnalyticsDtos.OrganizerAnalytics;
import com.eventpulse.analytics.AnalyticsDtos.PersonalAnalytics;

/**
 * Read-only aggregations straight from SQL. Tickets are the source of truth
 * for "sold" (one row per issued ticket); orders carry the money.
 */
@Service
public class AnalyticsService {

    private final JdbcTemplate jdbc;

    public AnalyticsService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional(readOnly = true)
    public OrganizerAnalytics organizer(UUID organizerId) {
        List<EventStats> events = jdbc.query("""
                select e.id, e.title, e.status, e.starts_at,
                       coalesce(sum(tt.capacity), 0) as capacity,
                       count(t.id) as sold,
                       count(t.id) filter (where t.status = 'CHECKED_IN') as checked_in,
                       coalesce(sum(tt.price_cents) filter (where t.id is not null), 0) as revenue,
                       count(t.id) filter (where t.created_at > now() - interval '7 days') as sold_7d
                from events e
                left join ticket_types tt on tt.event_id = e.id
                left join tickets t on t.ticket_type_id = tt.id and t.status <> 'VOID'
                where e.organizer_id = ?
                group by e.id
                order by e.starts_at desc
                """,
                (rs, i) -> new EventStats(
                        rs.getObject("id", UUID.class),
                        rs.getString("title"),
                        rs.getString("status"),
                        rs.getTimestamp("starts_at").toInstant(),
                        rs.getLong("capacity"),
                        rs.getLong("sold"),
                        rs.getLong("checked_in"),
                        rs.getLong("revenue"),
                        rs.getLong("sold_7d"),
                        List.of()),
                organizerId);

        Map<UUID, List<DailyCount>> timelines = salesTimelines(organizerId);
        events = events.stream()
                .map(event -> new EventStats(
                        event.eventId(), event.title(), event.status(), event.startsAt(),
                        event.capacity(), event.sold(), event.checkedIn(), event.revenueCents(),
                        event.soldLast7Days(),
                        timelines.getOrDefault(event.eventId(), List.of())))
                .toList();

        List<CategoryCount> categories = jdbc.query("""
                select e.category, count(t.id) as sold
                from events e
                join ticket_types tt on tt.event_id = e.id
                join tickets t on t.ticket_type_id = tt.id and t.status <> 'VOID'
                where e.organizer_id = ?
                group by e.category
                order by sold desc
                """,
                (rs, i) -> new CategoryCount(rs.getString("category"), rs.getLong("sold")),
                organizerId);

        // Money returned to attendees: confirmed orders for events this
        // organizer later cancelled. (Orders are the source of truth for money.)
        Long refunded = jdbc.queryForObject("""
                select coalesce(sum(o.total_cents), 0)
                from orders o
                join events e on e.id = o.event_id
                where e.organizer_id = ? and o.status = 'CONFIRMED' and e.status = 'CANCELLED'
                """,
                Long.class, organizerId);

        return new OrganizerAnalytics(
                events.size(),
                events.stream().mapToLong(EventStats::sold).sum(),
                events.stream().mapToLong(EventStats::revenueCents).sum(),
                refunded == null ? 0 : refunded,
                events.stream().mapToLong(EventStats::checkedIn).sum(),
                categories,
                events);
    }

    /** Tickets per day over the last 14 days, keyed by event. */
    private Map<UUID, List<DailyCount>> salesTimelines(UUID organizerId) {
        record Row(UUID eventId, LocalDate date, long count) {
        }
        return jdbc.query("""
                select e.id as event_id, cast(t.created_at as date) as day, count(*) as sold
                from events e
                join ticket_types tt on tt.event_id = e.id
                join tickets t on t.ticket_type_id = tt.id and t.status <> 'VOID'
                where e.organizer_id = ? and t.created_at > now() - interval '14 days'
                group by e.id, day
                order by day
                """,
                (rs, i) -> new Row(
                        rs.getObject("event_id", UUID.class),
                        rs.getObject("day", Date.class).toLocalDate(),
                        rs.getLong("sold")),
                organizerId)
                .stream()
                .collect(Collectors.groupingBy(
                        Row::eventId,
                        Collectors.mapping(
                                (Row row) -> new DailyCount(row.date(), row.count()),
                                Collectors.toList())));
    }

    @Transactional(readOnly = true)
    public PersonalAnalytics personal(UUID userId) {
        Long bought = jdbc.queryForObject(
                "select count(*) from tickets where owner_id = ? and status <> 'VOID'",
                Long.class, userId);
        Long grossSpent = jdbc.queryForObject(
                "select coalesce(sum(total_cents), 0) from orders where user_id = ? and status = 'CONFIRMED'",
                Long.class, userId);
        // Refunds: confirmed orders whose event was later cancelled.
        Long refunded = jdbc.queryForObject("""
                select coalesce(sum(o.total_cents), 0)
                from orders o
                join events e on e.id = o.event_id
                where o.user_id = ? and o.status = 'CONFIRMED' and e.status = 'CANCELLED'
                """,
                Long.class, userId);
        Long attended = jdbc.queryForObject(
                "select count(distinct event_id) from tickets where owner_id = ? and status = 'CHECKED_IN'",
                Long.class, userId);
        // Distinct future events with a live ticket, not raw ticket count.
        Long upcomingEvents = jdbc.queryForObject("""
                select count(distinct e.id) from tickets t
                join events e on e.id = t.event_id
                where t.owner_id = ? and t.status = 'VALID' and e.starts_at > now()
                """,
                Long.class, userId);

        List<CategoryCount> categories = jdbc.query("""
                select e.category, count(*) as bought
                from tickets t
                join events e on e.id = t.event_id
                where t.owner_id = ? and t.status <> 'VOID'
                group by e.category
                order by bought desc
                """,
                (rs, i) -> new CategoryCount(rs.getString("category"), rs.getLong("bought")),
                userId);

        long gross = grossSpent == null ? 0 : grossSpent;
        long refund = refunded == null ? 0 : refunded;
        return new PersonalAnalytics(
                bought == null ? 0 : bought,
                gross - refund,
                refund,
                attended == null ? 0 : attended,
                upcomingEvents == null ? 0 : upcomingEvents,
                categories);
    }
}
