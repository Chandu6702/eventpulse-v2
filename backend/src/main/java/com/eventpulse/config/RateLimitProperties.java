package com.eventpulse.config;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Per-IP rate limit on the credential endpoints (/auth/login, /auth/register).
 * {@code capacity} requests are allowed per {@code refillPeriod}; the bucket
 * refills smoothly (greedy) rather than all at once.
 */
@ConfigurationProperties(prefix = "app.security.rate-limit")
public record RateLimitProperties(boolean enabled, int capacity, Duration refillPeriod) {
}
