package com.eventpulse.order;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

public interface OrderRepository extends JpaRepository<Order, UUID> {

    Optional<Order> findByUserIdAndIdempotencyKey(UUID userId, String idempotencyKey);

    Page<Order> findByUserId(UUID userId, Pageable pageable);

    /**
     * Row lock for state transitions. Confirm, cancel and the expiry job all
     * take this lock first, so an order can never be confirmed and expired
     * at the same time.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from Order o where o.id = :id")
    Optional<Order> findByIdForUpdate(@Param("id") UUID id);

    @Query("select o.id from Order o where o.status = 'PENDING' and o.expiresAt < :now")
    List<UUID> findExpiredPendingIds(@Param("now") Instant now);
}
