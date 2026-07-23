# Testing

The backend suite is integration-first: every meaningful test runs against a
**real PostgreSQL 17** container via Testcontainers, because the system's
core guarantees (row locking, atomic conditional updates, `CHECK`
constraints) are exactly the things an in-memory database like H2 fakes
differently or skips.

## Running the suite

Two interchangeable database sources (`AbstractIntegrationTest` picks
automatically):

**Local PostgreSQL — no Docker.** Create a dedicated test database once
(`CREATE DATABASE eventpulse_test OWNER eventpulse;`), then:

```bash
cd backend && TEST_DB_URL=jdbc:postgresql://localhost:5432/eventpulse_test ./mvnw verify
```

In IntelliJ, set `TEST_DB_URL` once in **Run → Edit Configurations →
Edit configuration templates → JUnit → Environment variables** — after that,
right-click → Run on any test class just works. Credentials default to
`eventpulse`/`eventpulse` (override with `TEST_DB_USERNAME`/`TEST_DB_PASSWORD`).
Use a separate `eventpulse_test` database so test data never mixes with your
dev data.

**Testcontainers — needs Docker.** With no `TEST_DB_URL` set, a throwaway
`postgres:17-alpine` container is started and shared across the whole run
(singleton-container pattern). This is what CI uses: `./mvnw verify`.

## What is covered

| Test class | Proves |
|---|---|
| `BookingConcurrencyIntegrationTest` | 20 concurrent buyers racing for 10 tickets → exactly 10 orders succeed; idempotency-key replay holds inventory once; confirm converts holds to sales and re-confirming is a no-op; expiry releases inventory and promotes the waitlist FIFO |
| `AuthFlowIntegrationTest` | Register/login over real HTTP; refresh-token rotation returns a new cookie; replaying a rotated token is rejected and revokes the whole session family |
| `CheckInIntegrationTest` | A QR code checks in exactly once (second scan rejected with the original scan time); only the event's organizer can scan |
| `EventpulseApiApplicationTests` | Full context boots and all Flyway migrations apply cleanly |

## Notes for test authors

Two subtleties these tests already ran into — keep them in mind:

- **Cookie assertions:** read `Set-Cookie` via raw header values.
  `HttpHeaders.getValuesAsList` splits on commas, and cookie `Expires` dates
  contain one — the header gets truncated mid-value.
- **Cookie jars:** the default test HTTP client stores cookies, which
  silently substitutes the newest refresh token into requests that
  deliberately replay an old one. Token-rotation tests must use a
  cookie-less request factory (see `AuthFlowIntegrationTest`).
- **Bulk updates vs the persistence context:** JPQL `@Modifying` queries
  bypass the first-level cache. Reading an entity after bulk-updating it in
  the same transaction returns stale state — use scalar queries (see
  `TicketTypeRepository.availableOf`).
