package com.eventpulse.auth.dto;

import com.eventpulse.user.Role;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank @Size(max = 100) String name,
        @NotBlank @Email @Size(max = 255) String email,
        @NotBlank @Size(min = 8, max = 72) String password,
        Role role) {

    /**
     * Only ATTENDEE and ORGANIZER are self-assignable; anything else
     * (including null) falls back to ATTENDEE.
     */
    public Role safeRole() {
        return role == Role.ORGANIZER ? Role.ORGANIZER : Role.ATTENDEE;
    }
}
