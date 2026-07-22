package com.eventpulse.waitlist;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.eventpulse.waitlist.dto.WaitlistEntryResponse;

@RestController
@RequestMapping("/api/v1")
public class WaitlistController {

    private final WaitlistService waitlistService;

    public WaitlistController(WaitlistService waitlistService) {
        this.waitlistService = waitlistService;
    }

    @PostMapping("/ticket-types/{ticketTypeId}/waitlist")
    @ResponseStatus(HttpStatus.CREATED)
    public WaitlistEntryResponse join(
            @PathVariable UUID ticketTypeId,
            @AuthenticationPrincipal Jwt jwt) {
        return waitlistService.join(ticketTypeId, UUID.fromString(jwt.getSubject()));
    }

    @GetMapping("/waitlist/mine")
    public List<WaitlistEntryResponse> myEntries(@AuthenticationPrincipal Jwt jwt) {
        return waitlistService.myEntries(UUID.fromString(jwt.getSubject()));
    }
}
