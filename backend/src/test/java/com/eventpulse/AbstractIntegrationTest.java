package com.eventpulse;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * Base class for integration tests. Two ways to provide the database:
 *
 * 1. Local PostgreSQL (no Docker): set TEST_DB_URL, e.g.
 *    {@code TEST_DB_URL=jdbc:postgresql://localhost:5432/eventpulse_test}
 *    (credentials default to eventpulse/eventpulse; override with
 *    TEST_DB_USERNAME / TEST_DB_PASSWORD). Flyway migrates it automatically.
 *
 * 2. Otherwise a throwaway PostgreSQL container is started via Testcontainers
 *    (requires Docker) — this is what CI uses. The container is shared across
 *    all test classes (singleton-container pattern).
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
public abstract class AbstractIntegrationTest {

    private static final String LOCAL_DB_URL = System.getenv("TEST_DB_URL");

    static final PostgreSQLContainer POSTGRES =
            LOCAL_DB_URL == null ? new PostgreSQLContainer("postgres:17-alpine") : null;

    static {
        if (POSTGRES != null) {
            POSTGRES.start();
        }
    }

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        if (POSTGRES != null) {
            registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
            registry.add("spring.datasource.username", POSTGRES::getUsername);
            registry.add("spring.datasource.password", POSTGRES::getPassword);
        } else {
            registry.add("spring.datasource.url", () -> LOCAL_DB_URL);
            registry.add("spring.datasource.username",
                    () -> System.getenv().getOrDefault("TEST_DB_USERNAME", "eventpulse"));
            registry.add("spring.datasource.password",
                    () -> System.getenv().getOrDefault("TEST_DB_PASSWORD", "eventpulse"));
        }
    }
}
