package com.eventpulse.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureTestRestTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.TestPropertySource;

import com.eventpulse.AbstractIntegrationTest;

/**
 * Re-enables the per-IP throttle with a tiny capacity and proves that a burst
 * of login attempts from one client is cut off with 429 once the bucket is
 * drained. Bad-credential attempts still consume tokens — that is the point.
 */
@AutoConfigureTestRestTemplate
@TestPropertySource(properties = {
        "app.security.rate-limit.enabled=true",
        "app.security.rate-limit.capacity=3",
        "app.security.rate-limit.refill-period=1m"
})
class RateLimitIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private TestRestTemplate rest;

    @Test
    @SuppressWarnings("rawtypes")
    void loginBurstFromOneClientIsThrottled() {
        Map<String, String> attempt = Map.of(
                "email", "nobody-" + UUID.randomUUID() + "@test.dev",
                "password", "whatever-Pass1");

        // capacity = 3: the first three attempts pass the filter and fail
        // auth (401); the fourth is rejected by the limiter before auth runs.
        for (int i = 0; i < 3; i++) {
            ResponseEntity<Map> response = rest.postForEntity("/api/v1/auth/login", attempt, Map.class);
            assertThat(response.getStatusCode())
                    .as("attempt %d should reach auth and be rejected", i + 1)
                    .isEqualTo(HttpStatus.UNAUTHORIZED);
        }

        ResponseEntity<Map> throttled = rest.postForEntity("/api/v1/auth/login", attempt, Map.class);
        assertThat(throttled.getStatusCode()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
        assertThat(throttled.getHeaders().getFirst("Retry-After")).isNotNull();
    }
}
