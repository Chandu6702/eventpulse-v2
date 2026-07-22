package com.eventpulse.waitlist;

import java.time.Instant;
import java.util.UUID;

import com.eventpulse.event.TicketType;
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

@Entity
@Table(name = "waitlist_entries")
public class WaitlistEntry {

    public enum Status {
        WAITING,
        NOTIFIED,
        CONVERTED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ticket_type_id")
    private TicketType ticketType;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "notified_at")
    private Instant notifiedAt;

    protected WaitlistEntry() {
        // JPA
    }

    public WaitlistEntry(TicketType ticketType, User user) {
        this.ticketType = ticketType;
        this.user = user;
        this.status = Status.WAITING;
    }

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }

    public void markNotified() {
        this.status = Status.NOTIFIED;
        this.notifiedAt = Instant.now();
    }

    public void markConverted() {
        this.status = Status.CONVERTED;
    }

    public UUID getId() {
        return id;
    }

    public TicketType getTicketType() {
        return ticketType;
    }

    public User getUser() {
        return user;
    }

    public Status getStatus() {
        return status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getNotifiedAt() {
        return notifiedAt;
    }
}
