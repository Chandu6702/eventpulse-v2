package com.eventpulse.auth;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.eventpulse.auth.dto.AuthResponse;
import com.eventpulse.auth.dto.LoginRequest;
import com.eventpulse.auth.dto.RegisterRequest;
import com.eventpulse.common.exception.ConflictException;
import com.eventpulse.common.exception.UnauthorizedException;
import com.eventpulse.user.User;
import com.eventpulse.user.UserRepository;
import com.eventpulse.user.dto.UserResponse;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final PasswordPolicy passwordPolicy;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            RefreshTokenService refreshTokenService,
            PasswordPolicy passwordPolicy) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.refreshTokenService = refreshTokenService;
        this.passwordPolicy = passwordPolicy;
    }

    @Transactional
    public AuthResult register(RegisterRequest request) {
        String email = request.email().trim().toLowerCase();
        if (userRepository.existsByEmail(email)) {
            throw new ConflictException("An account with this email already exists");
        }
        passwordPolicy.validate(request.password(), email, request.name());

        User user = userRepository.save(new User(
                request.name().trim(),
                email,
                passwordEncoder.encode(request.password()),
                request.safeRole()));

        return buildResult(user);
    }

    @Transactional
    public AuthResult login(LoginRequest request) {
        User user = userRepository.findByEmail(request.email().trim().toLowerCase())
                .orElseThrow(() -> new UnauthorizedException("Invalid email or password"));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new UnauthorizedException("Invalid email or password");
        }

        return buildResult(user);
    }

    // noRollbackFor: reuse detection inside rotate() must keep its
    // family-revocation write even though the request ends in a 401.
    @Transactional(noRollbackFor = UnauthorizedException.class)
    public AuthResult refresh(String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            throw new UnauthorizedException("Missing refresh token");
        }
        RefreshTokenService.RotationResult rotation = refreshTokenService.rotate(rawRefreshToken);
        return new AuthResult(
                new AuthResponse(
                        jwtService.generateAccessToken(rotation.user()),
                        jwtService.accessTokenTtlSeconds(),
                        UserResponse.from(rotation.user())),
                rotation.rawToken());
    }

    @Transactional
    public void logout(String rawRefreshToken) {
        if (rawRefreshToken != null && !rawRefreshToken.isBlank()) {
            refreshTokenService.revoke(rawRefreshToken);
        }
    }

    private AuthResult buildResult(User user) {
        return new AuthResult(
                new AuthResponse(
                        jwtService.generateAccessToken(user),
                        jwtService.accessTokenTtlSeconds(),
                        UserResponse.from(user)),
                refreshTokenService.issue(user));
    }

    /**
     * Pairs the JSON response body with the raw refresh token, which the
     * controller layer turns into an httpOnly cookie (never JSON).
     */
    public record AuthResult(AuthResponse response, String refreshToken) {
    }
}
