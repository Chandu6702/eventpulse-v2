package com.eventpulse.checkin;

import java.util.UUID;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.eventpulse.checkin.dto.CheckInResponse;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@RestController
@RequestMapping("/api/v1/check-in")
public class CheckInController {

    private final CheckInService checkInService;

    public CheckInController(CheckInService checkInService) {
        this.checkInService = checkInService;
    }

    /** eventId names the gate: which event this scanning station admits. */
    public record CheckInRequest(@NotBlank String code, @NotNull UUID eventId) {
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    public CheckInResponse checkIn(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CheckInRequest request) {
        return checkInService.checkIn(
                request.code(), request.eventId(), UUID.fromString(jwt.getSubject()));
    }
}
