package com.eventpulse.checkin;

import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.eventpulse.checkin.dto.CheckInResponse;
import com.eventpulse.common.exception.ConflictException;
import com.eventpulse.common.exception.ForbiddenException;
import com.eventpulse.common.exception.NotFoundException;
import com.eventpulse.ticket.Ticket;
import com.eventpulse.ticket.TicketRepository;
import com.eventpulse.ticket.TicketStatus;

/**
 * Gate scanning. The ticket row is locked while its status is checked, so
 * the same QR code scanned at two gates simultaneously admits exactly once.
 * Scans are scoped to a gate's event: a genuine ticket for a different
 * event (even by the same organizer, e.g. two halls in one venue) is
 * rejected with the event it actually belongs to.
 */
@Service
public class CheckInService {

    // The platform currently operates in one market (prices are INR), so
    // human-readable staff messages use IST rather than a per-user zone.
    private static final DateTimeFormatter SCAN_TIME = DateTimeFormatter
            .ofPattern("d MMM yyyy, h:mm a")
            .withZone(ZoneId.of("Asia/Kolkata"));

    private final TicketRepository ticketRepository;

    public CheckInService(TicketRepository ticketRepository) {
        this.ticketRepository = ticketRepository;
    }

    @Transactional
    public CheckInResponse checkIn(String code, UUID eventId, UUID staffUserId) {
        Ticket ticket = ticketRepository.findByCodeForUpdate(code)
                .orElseThrow(() -> new NotFoundException("Unknown ticket code"));

        if (!ticket.getEvent().isOwnedBy(staffUserId)) {
            throw new ForbiddenException("You do not manage this event");
        }
        if (!ticket.getEvent().getId().equals(eventId)) {
            throw new ConflictException(
                    "Wrong gate — this ticket is for \"" + ticket.getEvent().getTitle() + "\"");
        }
        if (ticket.getStatus() == TicketStatus.CHECKED_IN) {
            throw new ConflictException(
                    "Ticket already checked in at " + SCAN_TIME.format(ticket.getCheckedInAt()));
        }
        if (ticket.getStatus() != TicketStatus.VALID) {
            throw new ConflictException("Ticket is void");
        }

        ticket.markCheckedIn();
        return CheckInResponse.from(ticket);
    }
}
