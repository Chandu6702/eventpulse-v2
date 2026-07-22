package com.eventpulse.ticket;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

public interface TicketRepository extends JpaRepository<Ticket, UUID> {

    List<Ticket> findByOwnerIdOrderByCreatedAtDesc(UUID ownerId);

    /**
     * Locked lookup for check-in so two staff scanning the same code at the
     * same moment cannot both succeed.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from Ticket t where t.code = :code")
    Optional<Ticket> findByCodeForUpdate(@Param("code") String code);
}
