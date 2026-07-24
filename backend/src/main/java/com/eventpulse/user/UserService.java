package com.eventpulse.user;

import java.util.UUID;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.eventpulse.auth.PasswordPolicy;
import com.eventpulse.common.exception.BadRequestException;
import com.eventpulse.common.exception.NotFoundException;
import com.eventpulse.user.dto.ChangePasswordRequest;
import com.eventpulse.user.dto.UpdateProfileRequest;
import com.eventpulse.user.dto.UserResponse;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final PasswordPolicy passwordPolicy;

    public UserService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            PasswordPolicy passwordPolicy) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.passwordPolicy = passwordPolicy;
    }

    @Transactional(readOnly = true)
    public User getById(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("User not found"));
    }

    @Transactional(readOnly = true)
    public UserResponse getProfile(UUID userId) {
        return UserResponse.from(getById(userId));
    }

    @Transactional
    public UserResponse updateProfile(UUID userId, UpdateProfileRequest request) {
        User user = getById(userId);
        user.setName(request.name().trim());
        return UserResponse.from(user);
    }

    @Transactional
    public void changePassword(UUID userId, ChangePasswordRequest request) {
        User user = getById(userId);
        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new BadRequestException("Current password is incorrect");
        }
        passwordPolicy.validate(request.newPassword(), user.getEmail(), user.getName());
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
    }

    /**
     * Attendee -> organizer upgrade. The client must refresh its access
     * token afterwards so the new role lands in the JWT.
     */
    @Transactional
    public UserResponse becomeOrganizer(UUID userId) {
        User user = getById(userId);
        user.promoteToOrganizer();
        return UserResponse.from(user);
    }
}
