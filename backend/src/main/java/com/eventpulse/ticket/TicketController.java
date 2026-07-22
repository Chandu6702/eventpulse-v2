package com.eventpulse.ticket;

import java.util.List;
import java.util.UUID;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.eventpulse.ticket.dto.TicketResponse;

@RestController
@RequestMapping("/api/v1/tickets")
public class TicketController {

    private final TicketRepository ticketRepository;

    public TicketController(TicketRepository ticketRepository) {
        this.ticketRepository = ticketRepository;
    }

    @GetMapping
    public List<TicketResponse> myTickets(@AuthenticationPrincipal Jwt jwt) {
        return ticketRepository.findByOwnerIdOrderByCreatedAtDesc(UUID.fromString(jwt.getSubject()))
                .stream()
                .map(TicketResponse::from)
                .toList();
    }
}
