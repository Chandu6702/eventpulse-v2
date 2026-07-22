package com.eventpulse.auth.dto;

import com.eventpulse.user.dto.UserResponse;

public record AuthResponse(String accessToken, long expiresInSeconds, UserResponse user) {
}
