package com.eventpulse.waitlist;

import java.util.List;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.eventpulse.common.exception.ConflictException;
import com.eventpulse.common.exception.NotFoundException;
import com.eventpulse.event.TicketType;
import com.eventpulse.event.TicketTypeRepository;
import com.eventpulse.user.UserService;
import com.eventpulse.waitlist.dto.WaitlistEntryResponse;

@Service
public class WaitlistService {

    private static final Logger log = LoggerFactory.getLogger(WaitlistService.class);

    private final WaitlistRepository waitlistRepository;
    private final TicketTypeRepository ticketTypeRepository;
    private final UserService userService;

    public WaitlistService(
            WaitlistRepository waitlistRepository,
            TicketTypeRepository ticketTypeRepository,
            UserService userService) {
        this.waitlistRepository = waitlistRepository;
        this.ticketTypeRepository = ticketTypeRepository;
        this.userService = userService;
    }

    @Transactional
    public WaitlistEntryResponse join(UUID ticketTypeId, UUID userId) {
        TicketType ticketType = ticketTypeRepository.findById(ticketTypeId)
                .orElseThrow(() -> new NotFoundException("Ticket type not found"));

        if (ticketType.available() > 0) {
            throw new ConflictException("Tickets are still available — book directly instead");
        }
        if (waitlistRepository.findByTicketTypeIdAndUserId(ticketTypeId, userId).isPresent()) {
            throw new ConflictException("You are already on this waitlist");
        }

        WaitlistEntry entry = waitlistRepository.save(
                new WaitlistEntry(ticketType, userService.getById(userId)));
        return WaitlistEntryResponse.from(entry,
                waitlistRepository.countByTicketTypeIdAndStatus(ticketTypeId, WaitlistEntry.Status.WAITING));
    }

    @Transactional(readOnly = true)
    public List<WaitlistEntryResponse> myEntries(UUID userId) {
        return waitlistRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(entry -> WaitlistEntryResponse.from(entry, 0))
                .toList();
    }

    /**
     * Invoked whenever a hold is released, inside the releasing transaction —
     * promotion and release commit or roll back together. Availability is
     * read with a scalar query because the release was a bulk update the
     * persistence context has not seen. In production the "notification"
     * would go through an outbox to email/push; here it flips the entry to
     * NOTIFIED, which the UI surfaces as "your turn".
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public void notifyInventoryReleased(UUID ticketTypeId) {
        Integer available = ticketTypeRepository.availableOf(ticketTypeId);
        if (available == null || available <= 0) {
            return;
        }

        List<WaitlistEntry> next = waitlistRepository.findOldestWaitingForUpdate(
                ticketTypeId, PageRequest.of(0, available));
        next.forEach(entry -> {
            entry.markNotified();
            log.info("Waitlist promotion: user {} notified for ticket type {}",
                    entry.getUser().getId(), ticketTypeId);
        });
    }
}
