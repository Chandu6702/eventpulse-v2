package com.eventpulse.config;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;

import com.eventpulse.auth.AuthRateLimitFilter;

/**
 * Registers {@link AuthRateLimitFilter} for the credential endpoints only, and
 * ahead of the Spring Security chain so throttled requests are rejected before
 * any authentication work happens.
 */
@Configuration
public class RateLimitConfig {

    @Bean
    FilterRegistrationBean<AuthRateLimitFilter> authRateLimitFilter(RateLimitProperties properties) {
        FilterRegistrationBean<AuthRateLimitFilter> registration =
                new FilterRegistrationBean<>(new AuthRateLimitFilter(properties));
        registration.addUrlPatterns("/api/v1/auth/login", "/api/v1/auth/register");
        registration.setOrder(Ordered.HIGHEST_PRECEDENCE);
        return registration;
    }
}
