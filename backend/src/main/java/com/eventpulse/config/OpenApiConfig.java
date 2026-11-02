package com.eventpulse.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;

/**
 * Serves interactive API docs at {@code /swagger-ui.html} (spec at
 * {@code /v3/api-docs}). Declares the bearer-JWT scheme once so the
 * "Authorize" button lets you paste an access token and exercise the
 * protected endpoints straight from the browser.
 */
@Configuration
public class OpenApiConfig {

    private static final String BEARER_SCHEME = "bearer-jwt";

    @Bean
    OpenAPI eventpulseOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("EventPulse API")
                        .version("v1")
                        .description("""
                                Event ticketing platform: concurrency-safe booking, idempotent \
                                checkout, QR gate check-in, and waitlists. Auth endpoints are \
                                public; everything else expects a bearer access token obtained \
                                from /api/v1/auth/login.""")
                        .license(new License().name("MIT").url("https://opensource.org/licenses/MIT")))
                .components(new Components().addSecuritySchemes(BEARER_SCHEME,
                        new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")))
                .addSecurityItem(new SecurityRequirement().addList(BEARER_SCHEME));
    }
}
