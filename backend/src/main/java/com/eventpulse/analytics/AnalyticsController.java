package com.eventpulse.analytics;

import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.eventpulse.analytics.AnalyticsDtos.Insight;
import com.eventpulse.analytics.AnalyticsDtos.OrganizerAnalytics;
import com.eventpulse.analytics.AnalyticsDtos.PersonalAnalytics;

@RestController
@RequestMapping("/api/v1/analytics")
public class AnalyticsController {

    private final AnalyticsService analyticsService;
    private final InsightService insightService;

    public AnalyticsController(AnalyticsService analyticsService, InsightService insightService) {
        this.analyticsService = analyticsService;
        this.insightService = insightService;
    }

    @GetMapping("/me")
    public PersonalAnalytics personal(@AuthenticationPrincipal Jwt jwt) {
        return analyticsService.personal(UUID.fromString(jwt.getSubject()));
    }

    @GetMapping("/organizer")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    public OrganizerAnalytics organizer(@AuthenticationPrincipal Jwt jwt) {
        return analyticsService.organizer(UUID.fromString(jwt.getSubject()));
    }

    /** 204 when no AI key is configured — the dashboard simply hides the card. */
    @GetMapping("/me/insight")
    public ResponseEntity<Insight> personalInsight(@AuthenticationPrincipal Jwt jwt) {
        return insightService
                .generate("ticket buyer", analyticsService.personal(UUID.fromString(jwt.getSubject())))
                .map(text -> ResponseEntity.ok(new Insight(text)))
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @GetMapping("/organizer/insight")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    public ResponseEntity<Insight> organizerInsight(@AuthenticationPrincipal Jwt jwt) {
        return insightService
                .generate("event organizer", analyticsService.organizer(UUID.fromString(jwt.getSubject())))
                .map(text -> ResponseEntity.ok(new Insight(text)))
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    /**
     * Diagnostic for the AI layer: runs a live one-word test call and reports
     * whether it worked, so a misconfigured key or model is visible from the
     * browser. "ok" means insights will appear; anything else is the reason.
     */
    @GetMapping("/ai-status")
    public AiStatus aiStatus() {
        return new AiStatus(insightService.enabled(), insightService.diagnose());
    }

    public record AiStatus(boolean enabled, String status) {
    }
}
