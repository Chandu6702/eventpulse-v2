package com.eventpulse.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.eventpulse.common.exception.UnauthorizedException;
import com.eventpulse.config.JwtProperties;
import com.eventpulse.user.User;

/**
 * Refresh tokens are opaque 256-bit random values, stored only as SHA-256
 * hashes and rotated on every use. Presenting an already-rotated token is
 * treated as theft: the whole session family is revoked.
 */
@Service
public class RefreshTokenService {

    private static final Logger log = LoggerFactory.getLogger(RefreshTokenService.class);

    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtProperties properties;
    private final SecureRandom secureRandom = new SecureRandom();

    public RefreshTokenService(RefreshTokenRepository refreshTokenRepository, JwtProperties properties) {
        this.refreshTokenRepository = refreshTokenRepository;
        this.properties = properties;
    }

    @Transactional
    public String issue(User user) {
        String rawToken = generateRawToken();
        RefreshToken token = new RefreshToken(
                user, hash(rawToken), Instant.now().plus(properties.refreshTokenTtl()));
        refreshTokenRepository.save(token);
        return rawToken;
    }

    /**
     * Validates the presented token and rotates it: the old token is revoked
     * and a fresh one is issued atomically.
     *
     * <p>noRollbackFor is load-bearing: when reuse is detected we revoke the
     * whole token family and then throw 401 — without it, the rollback
     * triggered by the exception would silently undo the revocation.
     *
     * @return the rotated raw token together with its owner
     */
    @Transactional(noRollbackFor = UnauthorizedException.class)
    public RotationResult rotate(String rawToken) {
        RefreshToken current = refreshTokenRepository.findByTokenHash(hash(rawToken))
                .orElseThrow(() -> new UnauthorizedException("Invalid refresh token"));

        if (current.isRevoked()) {
            // Reuse of a rotated token -> assume the token family is compromised.
            log.warn("Refresh token reuse detected for user {}", current.getUser().getId());
            refreshTokenRepository.revokeAllForUser(current.getUser().getId());
            throw new UnauthorizedException("Refresh token reuse detected");
        }
        if (current.isExpired()) {
            throw new UnauthorizedException("Refresh token expired");
        }

        String newRawToken = generateRawToken();
        String newHash = hash(newRawToken);
        current.revoke(newHash);

        User user = current.getUser();
        refreshTokenRepository.save(new RefreshToken(
                user, newHash, Instant.now().plus(properties.refreshTokenTtl())));

        return new RotationResult(newRawToken, user);
    }

    @Transactional
    public void revoke(String rawToken) {
        refreshTokenRepository.findByTokenHash(hash(rawToken))
                .ifPresent(token -> token.revoke(null));
    }

    private String generateRawToken() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hash(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(rawToken.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }

    public record RotationResult(String rawToken, User user) {
    }
}
