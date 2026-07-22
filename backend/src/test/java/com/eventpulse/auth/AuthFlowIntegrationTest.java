package com.eventpulse.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import com.eventpulse.AbstractIntegrationTest;

class AuthFlowIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private TestRestTemplate rest;

    @Test
    @SuppressWarnings({ "rawtypes", "unchecked" })
    void registerLoginAndAccessProtectedEndpoint() {
        String email = "auth-" + UUID.randomUUID() + "@test.dev";

        ResponseEntity<Map> registered = rest.postForEntity(
                "/api/v1/auth/register",
                Map.of("name", "Auth Tester", "email", email, "password", "secret-password"),
                Map.class);

        assertThat(registered.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        String accessToken = (String) registered.getBody().get("accessToken");
        assertThat(accessToken).isNotBlank();
        assertThat(refreshCookie(registered)).contains("HttpOnly");

        // The access token works against a protected endpoint.
        ResponseEntity<Map> me = getWithBearer(accessToken, "/api/v1/users/me");
        assertThat(me.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(me.getBody().get("email")).isEqualTo(email);

        // Wrong password is rejected without revealing which field was wrong.
        ResponseEntity<Map> badLogin = rest.postForEntity(
                "/api/v1/auth/login",
                Map.of("email", email, "password", "wrong-password"),
                Map.class);
        assertThat(badLogin.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    @SuppressWarnings("rawtypes")
    void refreshRotatesTokenAndDetectsReuse() {
        String email = "rotate-" + UUID.randomUUID() + "@test.dev";
        ResponseEntity<Map> registered = rest.postForEntity(
                "/api/v1/auth/register",
                Map.of("name", "Rotate Tester", "email", email, "password", "secret-password"),
                Map.class);
        String originalCookie = refreshCookie(registered);

        // First refresh succeeds and hands out a *different* cookie.
        ResponseEntity<Map> refreshed = refreshWith(originalCookie);
        assertThat(refreshed.getStatusCode()).isEqualTo(HttpStatus.OK);
        String rotatedCookie = refreshCookie(refreshed);
        assertThat(rotatedCookie).isNotEqualTo(originalCookie);

        // Replaying the rotated-away token must fail...
        assertThat(refreshWith(originalCookie).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);

        // ...and reuse detection revokes the whole family, killing the
        // freshly rotated token as well.
        assertThat(refreshWith(rotatedCookie).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @SuppressWarnings("rawtypes")
    private ResponseEntity<Map> refreshWith(String setCookieHeader) {
        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.COOKIE, setCookieHeader.split(";", 2)[0]);
        return rest.exchange("/api/v1/auth/refresh", HttpMethod.POST,
                new HttpEntity<>(headers), Map.class);
    }

    @SuppressWarnings("rawtypes")
    private ResponseEntity<Map> getWithBearer(String token, String url) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        return rest.exchange(url, HttpMethod.GET, new HttpEntity<>(headers), Map.class);
    }

    private String refreshCookie(ResponseEntity<?> response) {
        return response.getHeaders().getValuesAsList(HttpHeaders.SET_COOKIE).stream()
                .filter(cookie -> cookie.startsWith("refresh_token="))
                .findFirst()
                .orElseThrow();
    }
}
