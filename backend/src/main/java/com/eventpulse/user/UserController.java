package com.eventpulse.user;

import java.util.UUID;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.eventpulse.user.dto.UpdateProfileRequest;
import com.eventpulse.user.dto.UserResponse;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/me")
    public UserResponse me(@AuthenticationPrincipal Jwt jwt) {
        return userService.getProfile(UUID.fromString(jwt.getSubject()));
    }

    @PatchMapping("/me")
    public UserResponse updateProfile(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody UpdateProfileRequest request) {
        return userService.updateProfile(UUID.fromString(jwt.getSubject()), request);
    }
}
