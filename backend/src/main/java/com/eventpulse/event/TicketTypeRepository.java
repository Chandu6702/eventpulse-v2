package com.eventpulse.event;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

public interface TicketTypeRepository extends JpaRepository<TicketType, UUID> {

    /**
     * SELECT ... FOR UPDATE — serializes concurrent bookings of the same
     * ticket type so the availability check and the hold are atomic.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from TicketType t where t.id = :id")
    Optional<TicketType> findByIdForUpdate(@Param("id") UUID id);

    /**
     * Atomic conditional hold: succeeds (returns 1) only when enough
     * inventory is available at the moment of the update.
     */
    @Modifying
    @Query("update TicketType t set t.held = t.held + :quantity "
            + "where t.id = :id and t.capacity - t.sold - t.held >= :quantity")
    int tryHold(@Param("id") UUID id, @Param("quantity") int quantity);

    /** Converts a hold into a sale after payment confirmation. */
    @Modifying
    @Query("update TicketType t set t.held = t.held - :quantity, t.sold = t.sold + :quantity "
            + "where t.id = :id and t.held >= :quantity")
    int confirmHold(@Param("id") UUID id, @Param("quantity") int quantity);

    /** Releases a hold when an order expires or is cancelled. */
    @Modifying
    @Query("update TicketType t set t.held = t.held - :quantity "
            + "where t.id = :id and t.held >= :quantity")
    int releaseHold(@Param("id") UUID id, @Param("quantity") int quantity);
}
