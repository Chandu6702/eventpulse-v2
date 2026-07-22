package com.eventpulse.user.dto;

import java.util.UUID;

import com.eventpulse.user.Role;
import com.eventpulse.user.User;

public record UserResponse(UUID id, String name, String email, Role role) {

    public static UserResponse from(User user) {
        return new UserResponse(user.getId(), user.getName(), user.getEmail(), user.getRole());
    }
}
