package com.eventpulse.event;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import com.eventpulse.common.exception.ConflictException;
import com.eventpulse.user.User;

import jakarta.persistence.CascadeType;
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
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "events")
public class Event {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organizer_id")
    private User organizer;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(columnDefinition = "text")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private EventCategory category;

    @Column(nullable = false, length = 200)
    private String venue;

    @Column(length = 100)
    private String city;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(name = "starts_at", nullable = false)
    private Instant startsAt;

    @Column(name = "ends_at", nullable = false)
    private Instant endsAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EventStatus status;

    @Column(name = "published_at")
    private Instant publishedAt;

    @OneToMany(mappedBy = "event", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<TicketType> ticketTypes = new ArrayList<>();

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Event() {
        // JPA
    }

    public Event(User organizer, String title, String description, EventCategory category,
            String venue, String city, Instant startsAt, Instant endsAt) {
        this.organizer = organizer;
        this.title = title;
        this.description = description;
        this.category = category;
        this.venue = venue;
        this.city = city;
        this.startsAt = startsAt;
        this.endsAt = endsAt;
        this.status = EventStatus.DRAFT;
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

    public void publish() {
        if (status != EventStatus.DRAFT) {
            throw new ConflictException("Only draft events can be published");
        }
        if (ticketTypes.isEmpty()) {
            throw new ConflictException("An event needs at least one ticket type before publishing");
        }
        status = EventStatus.PUBLISHED;
        publishedAt = Instant.now();
    }

    public void cancel() {
        if (status == EventStatus.CANCELLED) {
            throw new ConflictException("Event is already cancelled");
        }
        status = EventStatus.CANCELLED;
    }

    public boolean isEditable() {
        return status == EventStatus.DRAFT;
    }

    public boolean isOwnedBy(UUID userId) {
        return organizer.getId().equals(userId);
    }

    public UUID getId() {
        return id;
    }

    public User getOrganizer() {
        return organizer;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public EventCategory getCategory() {
        return category;
    }

    public void setCategory(EventCategory category) {
        this.category = category;
    }

    public String getVenue() {
        return venue;
    }

    public void setVenue(String venue) {
        this.venue = venue;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public Instant getStartsAt() {
        return startsAt;
    }

    public void setStartsAt(Instant startsAt) {
        this.startsAt = startsAt;
    }

    public Instant getEndsAt() {
        return endsAt;
    }

    public void setEndsAt(Instant endsAt) {
        this.endsAt = endsAt;
    }

    public EventStatus getStatus() {
        return status;
    }

    public Instant getPublishedAt() {
        return publishedAt;
    }

    public List<TicketType> getTicketTypes() {
        return ticketTypes;
    }

    public void addTicketType(TicketType ticketType) {
        ticketTypes.add(ticketType);
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
