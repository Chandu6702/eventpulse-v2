package com.eventpulse.auth;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.filter.OncePerRequestFilter;

import com.eventpulse.config.RateLimitProperties;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Throttles the credential endpoints per client IP to blunt credential
 * stuffing and brute-force password guessing. Registered only for
 * {@code /api/v1/auth/login} and {@code /api/v1/auth/register} (see
 * {@link com.eventpulse.config.RateLimitConfig}); token refresh and logout
 * are cookie-bound, not password-guessable, so they are left unthrottled.
 *
 * <p>Buckets are held in an in-process map, which is correct for the
 * single-instance deployment this ships as. Behind multiple instances the
 * limit would be per-instance; the production answer is a shared bucket in
 * Redis (bucket4j ships a Redis backend), noted in docs/ROADMAP.md.
 */
public class AuthRateLimitFilter extends OncePerRequestFilter {

    private final RateLimitProperties properties;
    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    public AuthRateLimitFilter(RateLimitProperties properties) {
        this.properties = properties;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        if (!properties.enabled()) {
            filterChain.doFilter(request, response);
            return;
        }

        Bucket bucket = buckets.computeIfAbsent(clientIp(request), key -> newBucket());
        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);

        if (probe.isConsumed()) {
            response.setHeader("X-Rate-Limit-Remaining", Long.toString(probe.getRemainingTokens()));
            filterChain.doFilter(request, response);
            return;
        }

        long retryAfterSeconds = Math.max(1, probe.getNanosToWaitForRefill() / 1_000_000_000L);

        // Same RFC 9457 problem-detail shape as GlobalExceptionHandler. Written
        // by hand (not Jackson) because a FilterRegistrationBean is created too
        // early in startup to inject the ObjectMapper bean; the body is fully
        // controlled, so there is nothing to escape.
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setHeader("Retry-After", Long.toString(retryAfterSeconds));
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write("{\"type\":\"about:blank\",\"title\":\"Too Many Requests\","
                + "\"status\":429,\"detail\":\"Too many authentication attempts. Try again in "
                + retryAfterSeconds + "s.\"}");
    }

    private Bucket newBucket() {
        Bandwidth limit = Bandwidth.builder()
                .capacity(properties.capacity())
                .refillGreedy(properties.capacity(), properties.refillPeriod())
                .build();
        return Bucket.builder().addLimit(limit).build();
    }

    /** First hop of X-Forwarded-For when behind a proxy/ALB, else the socket address. */
    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",", 2)[0].trim();
        }
        return request.getRemoteAddr();
    }
}
