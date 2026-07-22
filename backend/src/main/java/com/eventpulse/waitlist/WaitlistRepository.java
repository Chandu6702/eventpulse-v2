package com.eventpulse.waitlist;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

public interface WaitlistRepository extends JpaRepository<WaitlistEntry, UUID> {

    Optional<WaitlistEntry> findByTicketTypeIdAndUserId(UUID ticketTypeId, UUID userId);

    List<WaitlistEntry> findByUserIdOrderByCreatedAtDesc(UUID userId);

    long countByTicketTypeIdAndStatus(UUID ticketTypeId, WaitlistEntry.Status status);

    /**
     * Oldest waiting entries first, locked so two concurrent releases don't
     * notify the same person twice.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select w from WaitlistEntry w where w.ticketType.id = :ticketTypeId "
            + "and w.status = 'WAITING' order by w.createdAt")
    List<WaitlistEntry> findOldestWaitingForUpdate(@Param("ticketTypeId") UUID ticketTypeId, Pageable pageable);
}
