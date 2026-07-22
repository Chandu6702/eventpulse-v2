package com.eventpulse.event;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

/**
 * Sellable inventory for an event. {@code sold} and {@code held} are only
 * ever mutated through the atomic queries in TicketTypeRepository — never
 * through entity setters — so concurrent bookings cannot oversell.
 */
@Entity
@Table(name = "ticket_types")
public class TicketType {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "event_id")
    private Event event;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "price_cents", nullable = false)
    private long priceCents;

    @Column(nullable = false, length = 3)
    private String currency = "INR";

    @Column(nullable = false)
    private int capacity;

    @Column(nullable = false)
    private int sold;

    @Column(nullable = false)
    private int held;

    @Column(name = "per_order_limit", nullable = false)
    private int perOrderLimit = 10;

    @Column(name = "sales_start_at")
    private Instant salesStartAt;

    @Column(name = "sales_end_at")
    private Instant salesEndAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected TicketType() {
        // JPA
    }

    public TicketType(Event event, String name, long priceCents, int capacity,
            int perOrderLimit, Instant salesStartAt, Instant salesEndAt) {
        this.event = event;
        this.name = name;
        this.priceCents = priceCents;
        this.capacity = capacity;
        this.perOrderLimit = perOrderLimit;
        this.salesStartAt = salesStartAt;
        this.salesEndAt = salesEndAt;
    }

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public int available() {
        return capacity - sold - held;
    }

    public boolean isOnSale(Instant now) {
        boolean started = salesStartAt == null || !now.isBefore(salesStartAt);
        boolean notEnded = salesEndAt == null || now.isBefore(salesEndAt);
        return started && notEnded;
    }

    public UUID getId() {
        return id;
    }

    public Event getEvent() {
        return event;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public long getPriceCents() {
        return priceCents;
    }

    public void setPriceCents(long priceCents) {
        this.priceCents = priceCents;
    }

    public String getCurrency() {
        return currency;
    }

    public int getCapacity() {
        return capacity;
    }

    public void setCapacity(int capacity) {
        this.capacity = capacity;
    }

    public int getSold() {
        return sold;
    }

    public int getHeld() {
        return held;
    }

    public int getPerOrderLimit() {
        return perOrderLimit;
    }

    public void setPerOrderLimit(int perOrderLimit) {
        this.perOrderLimit = perOrderLimit;
    }

    public Instant getSalesStartAt() {
        return salesStartAt;
    }

    public void setSalesStartAt(Instant salesStartAt) {
        this.salesStartAt = salesStartAt;
    }

    public Instant getSalesEndAt() {
        return salesEndAt;
    }

    public void setSalesEndAt(Instant salesEndAt) {
        this.salesEndAt = salesEndAt;
    }
}
