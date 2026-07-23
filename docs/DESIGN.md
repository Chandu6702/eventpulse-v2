# Design decisions

Why EventPulse v2 is built the way it is — including the paths not taken.

## Inventory model: counters, not rows

Each `ticket_types` row carries `capacity`, `sold`, `held`. Availability is
`capacity - sold - held`.

The alternative — a row per seat/ticket claimed with `SELECT … FOR UPDATE SKIP
LOCKED` — is the right call for *assigned seating*. For general-admission
tiers, counters keep the hot path to a single-row update and make the
invariant expressible as one `CHECK` constraint.

### The hold is a conditional write

```sql
UPDATE ticket_types
SET held = held + :qty
WHERE id = :id AND capacity - sold - held >= :qty
```

Zero rows updated ⇒ not enough inventory ⇒ the whole order transaction rolls
back (which automatically undoes holds taken for other items in the same
order). There is no read-check-write window because the check and the write
are the same statement. Two backstops sit underneath:

1. `CHECK (sold + held <= capacity)` — even buggy future code cannot persist
   an oversold state.
2. Every state transition on orders happens under a `SELECT … FOR UPDATE` row
   lock, so confirm and expiry cannot interleave.

### Why pessimistic over optimistic locking

Ticket drops are *contended by design* — every buyer wants the same row at
the same moment. Optimistic `@Version` locking would make most transactions
fail-and-retry exactly when traffic peaks. Row locks serialize the few
milliseconds that matter and degrade gracefully. (For low-contention flows —
profile edits, event edits — locking is deliberately absent.)

## Two-phase checkout: hold → confirm

`POST /orders` holds inventory and returns a `PENDING` order with a deadline;
`POST /orders/{id}/confirm` (mock payment) converts holds to sales and issues
tickets. This mirrors how a real PSP integration works: the confirm endpoint
would become a payment webhook, and *nothing else changes*.

Expiry is a scheduled sweep. Each overdue order is expired in its own
transaction so one failure cannot poison the batch, and the state is
re-checked under the row lock because a confirm may have won the race between
scan and lock.

## Idempotency

Client sends `Idempotency-Key` (the SPA generates a UUID per checkout intent).
Replay returns the original order — no second hold, no second charge. A unique
`(user_id, idempotency_key)` constraint backstops the check-then-insert race.

## Auth: short JWTs + rotating opaque refresh tokens

- Access tokens: HS256 JWTs, 15 min, held in SPA memory only (never
  localStorage — XSS cannot exfiltrate what is not persisted).
- Refresh tokens: opaque 256-bit values in an httpOnly cookie scoped to
  `/api/v1/auth`, stored server-side as SHA-256 hashes, **rotated on every
  refresh**. Presenting an already-rotated token is treated as theft and
  revokes the entire session family.

Spring's OAuth2 resource server verifies JWTs — no hand-rolled filters. HS256
(symmetric) is sufficient for a single-service deployment; splitting services
later means switching to RS256 so only one service holds the signing key.

## Schema is owned by Flyway

`ddl-auto: validate` — Hibernate never mutates the schema. Migrations are the
reviewable, ordered source of truth, and the integration tests run them
against a real PostgreSQL container (Testcontainers), not H2 — H2 would
silently skip the `CHECK` constraint semantics and row-locking behaviour this
system depends on.

## Frontend hosting: container vs static hosting

The SPA compiles to static files, so in a real AWS deployment it would go to
a static host (Amplify, or S3 + CloudFront) — cheaper, simpler and faster
than running web containers. The nginx-based frontend image in this repo
exists for two narrower reasons: it powers the self-contained
`docker-compose.prod.yml` demo (the stand-in for the intentionally
not-deployed cloud stack), and it keeps the Terraform ECS topology
symmetrical for illustration. Knowing that a static host replaces that whole
tier in production is the point — the container is a demo vehicle, not the
recommended hosting model.

## What I'd change at 10× scale

- **Read path:** cache the event catalogue (Redis) with short TTLs; the
  booking write path stays on PostgreSQL.
- **Hot drops:** per-ticket-type queueing (fair waiting room) in front of the
  hold endpoint instead of raw row-lock contention.
- **Notifications:** waitlist promotion and order events publish to a queue
  (SQS/SNS) for email/push instead of the in-process log-only notifier.
- **Payments:** real PSP + webhook confirmation with signature verification;
  the two-phase inventory model already anticipates this.
- **Observability:** structured logging + metrics on hold-failure rate, lock
  wait time and expiry-sweep lag — the three numbers that predict a bad drop.
