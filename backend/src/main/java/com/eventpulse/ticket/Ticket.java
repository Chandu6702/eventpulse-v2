package com.eventpulse.ticket;

import java.time.Instant;
import java.util.UUID;

import com.eventpulse.event.Event;
import com.eventpulse.event.TicketType;
import com.eventpulse.order.Order;
import com.eventpulse.user.User;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

/**
 * An issued ticket. The {@code code} is an opaque random value encoded as a
 * QR code on the client; check-in resolves it back to this row.
 */
@Entity
@Table(name = "tickets")
public class Ticket {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id")
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ticket_type_id")
    private TicketType ticketType;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "event_id")
    private Event event;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id")
    private User owner;

    @Column(nullable = false, unique = true, length = 64)
    private String code;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TicketStatus status;

    @Column(name = "checked_in_at")
    private Instant checkedInAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected Ticket() {
        // JPA
    }

    public Ticket(Order order, TicketType ticketType, User owner, String code) {
        this.order = order;
        this.ticketType = ticketType;
        this.event = ticketType.getEvent();
        this.owner = owner;
        this.code = code;
        this.status = TicketStatus.VALID;
    }

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public Order getOrder() {
        return order;
    }

    public TicketType getTicketType() {
        return ticketType;
    }

    public Event getEvent() {
        return event;
    }

    public User getOwner() {
        return owner;
    }

    public String getCode() {
        return code;
    }

    public TicketStatus getStatus() {
        return status;
    }

    public Instant getCheckedInAt() {
        return checkedInAt;
    }

    public void markCheckedIn() {
        this.status = TicketStatus.CHECKED_IN;
        this.checkedInAt = Instant.now();
    }
}
