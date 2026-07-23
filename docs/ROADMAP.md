# Roadmap — what's next and how I'd build it

The platform is a complete working model: booking under concurrency,
QR check-in, analytics, optional AI. Everything below is a deliberate
deferral, not a gap — each entry says why it's next, how it fits the
existing seams, and roughly what it costs to build.

---

## 1. Real payments — Razorpay test mode  `~2 hours`

**Why:** the checkout currently simulates the gateway. The architecture
already treats payment as a leaf: orders confirm with a `paymentReference`,
and inventory/tickets/analytics hang off the CONFIRMED state — so a real
gateway swaps in without touching the booking engine.

**How:**
- Sign up at dashboard.razorpay.com, stay in **Test Mode** (free, no KYC),
  generate `rzp_test_…` keys. Key id is public; secret stays backend-only
  (`RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` env vars).
- Backend (`com.razorpay:razorpay-java`): on order creation, create a
  Razorpay Order for `totalCents` (already in paise) and store
  `razorpay_order_id` (one migration). Replace the trusting confirm with
  verification: recompute `HMAC_SHA256(order_id + "|" + payment_id, secret)`
  and reject mismatches — only then run the existing locked confirm logic.
- Frontend: load `checkout.razorpay.com/v1/checkout.js`, open the modal on
  *Pay* (test card `4111 1111 1111 1111`), POST the returned ids + signature.
- Keep the mock behind `app.payments.provider: mock|razorpay` so zero-setup
  local demos keep working.

**Production-correct extra:** a `/webhooks/razorpay` endpoint (verified with
the webhook secret) marks orders paid even if the buyer's browser dies after
paying — real systems never trust only the client callback.

## 2. Cover images to object storage  `~half a day`

**Why:** uploads are browser-compressed and stored inline (base64 in
Postgres) — the right call for a storage-free deployment, but it bloats
rows and every browse response carries the bytes.

**How:** backend issues a presigned upload URL (S3 or Supabase Storage);
the browser PUTs the file directly (no image bytes through the API); the
DB keeps only the object URL — which the schema already models, so no
frontend rendering changes. Add a CDN in front for cache headers.

## 3. Email notifications  `~half a day`

**Why:** order confirmations and waitlist promotions currently only appear
in-app; email is the minimum for "launchable".

**How:** Spring Mail with a free-tier provider (Resend/Brevo SMTP). Send on
order CONFIRMED (ticket QRs attached or linked) and on waitlist NOTIFIED.
Send *after* commit (`@TransactionalEventListener(AFTER_COMMIT)`) so a
rolled-back order never emails anyone.

## 4. Outbox pattern for notifications  `~1 day`

**Why:** the waitlist promotion currently runs in-transaction; an email/API
failure shouldn't roll back a booking, and a crash shouldn't lose the
notification. This is the classic reliability upgrade interviewers love.

**How:** write "notification due" rows to an `outbox` table in the same
transaction as the state change; a scheduled worker reads, sends, and marks
them done (at-least-once + idempotent send). Removes the REQUIRES_NEW
transaction dance entirely.

## 5. Assigned seating  `~2-3 days`

**Why:** the inventory model counts fungible tickets per type. Reserved
seating (row K, seat 14) is the next hard concurrency problem.

**How:** one row per seat (`seat` table: event, section, row, number,
status). Selection locks candidate seats with
`SELECT … FOR UPDATE SKIP LOCKED` so two buyers grabbing adjacent seats
never deadlock and never wait on each other's rows. Seat map UI renders
from the same table.

## 6. Staff accounts for check-in  `~1 day`

**Why:** today the organizer's own login runs the gate. Real events hand
scanners to volunteers who shouldn't have dashboard access.

**How:** a `GATE_STAFF` role scoped to an event (join table
`event_staff(event_id, user_id)`); check-in authorizes "organizer OR staff
of this event"; organizers invite staff by email from the manage page.

## 7. API hardening  `~1 day`

- **Rate limiting** on `/auth/*` (Bucket4j filter, per-IP token bucket) —
  stops credential stuffing.
- **OpenAPI spec** via springdoc — free interactive docs at
  `/swagger-ui.html`, and the frontend types could be generated from it.

## 8. Observability  `~1 day`

Actuator already exposes metrics; wire Micrometer → Prometheus + a Grafana
dashboard (bookings/min, hold-expiry rate, check-in latency, 4xx/5xx). The
booking engine's interesting failures (oversell attempts blocked, idempotent
replays served) become counters worth graphing.

---

## Already-shipped upgrades (for context)

Concurrency-safe booking with DB-constraint backstop · idempotent checkout ·
rotating refresh tokens with reuse detection · waitlists with locked FIFO
promotion · gate-scoped 3-way check-in (hardware scanner / phone camera /
manual) · analytics dashboard with per-day sales · AI insights switchable
between Claude and Gemini's free tier (204 without a key) · attendee →
organizer upgrade · browser-compressed cover uploads · light/dark theming,
responsive to phones.
