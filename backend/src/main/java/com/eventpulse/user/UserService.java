package com.eventpulse.user;

import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.eventpulse.common.exception.NotFoundException;
import com.eventpulse.user.dto.UpdateProfileRequest;
import com.eventpulse.user.dto.UserResponse;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
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
}
