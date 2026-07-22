package com.eventpulse.checkin;

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
 */
@Service
public class CheckInService {

    private final TicketRepository ticketRepository;

    public CheckInService(TicketRepository ticketRepository) {
        this.ticketRepository = ticketRepository;
    }

    @Transactional
    public CheckInResponse checkIn(String code, UUID staffUserId) {
        Ticket ticket = ticketRepository.findByCodeForUpdate(code)
                .orElseThrow(() -> new NotFoundException("Unknown ticket code"));

        if (!ticket.getEvent().isOwnedBy(staffUserId)) {
            throw new ForbiddenException("You do not manage this event");
        }
        if (ticket.getStatus() == TicketStatus.CHECKED_IN) {
            throw new ConflictException(
                    "Ticket already checked in at " + ticket.getCheckedInAt());
        }
        if (ticket.getStatus() != TicketStatus.VALID) {
            throw new ConflictException("Ticket is void");
        }

        ticket.markCheckedIn();
        return CheckInResponse.from(ticket);
    }
}
