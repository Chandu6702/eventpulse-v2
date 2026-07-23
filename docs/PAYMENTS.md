# Upgrading the mock payment to Razorpay test mode

The checkout is deliberately built around a gateway-shaped seam: the client
confirms an order with a `paymentReference`, and everything downstream
(inventory, tickets, analytics) hangs off the order's CONFIRMED state. Mock
payment and real payment differ only in where that reference comes from —
so this upgrade touches the confirm step and nothing else.

## Why it isn't wired up yet

Razorpay test mode is free but needs an account (email + phone verification)
and account-specific API keys. Until those exist, gateway code can't be run
or tested — so the integration is documented rather than half-built.

## What you need (one-time, free)

1. Sign up at dashboard.razorpay.com — stay in **Test Mode** (toggle in the
   sidebar). No KYC needed for test mode.
2. Settings → API Keys → Generate test keys: `rzp_test_…` key id + secret.
3. Backend env/`application-local.yml`: `RAZORPAY_KEY_ID`,
   `RAZORPAY_KEY_SECRET`. The key id is public (frontend uses it); the
   secret never leaves the backend.

## Integration outline (~1-2 hours)

**Backend** (add `com.razorpay:razorpay-java`):

1. On order creation (or a new `POST /orders/{id}/payment-intent`), create a
   Razorpay Order for `totalCents` (`amount` is in paise — same unit) and
   store `razorpay_order_id` on the order (one migration).
2. Replace the trusting `confirm(paymentReference)` with verification:
   client sends `razorpay_order_id`, `razorpay_payment_id`,
   `razorpay_signature`; backend recomputes
   `HMAC_SHA256(order_id + "|" + payment_id, keySecret)` and rejects a
   mismatch. Only then run the existing confirm logic (which already holds
   the row lock and handles the expiry race).
3. Keep the mock path behind a flag (`app.payments.provider: mock|razorpay`)
   so local demos still work with zero setup.

**Frontend**:

1. Load `https://checkout.razorpay.com/v1/checkout.js`.
2. On *Pay*, open `new Razorpay({ key, order_id, handler })` — the modal
   shows test cards (e.g. `4111 1111 1111 1111`, any future expiry/CVV).
3. The `handler` callback receives the three fields; POST them to confirm.

**Optional but production-correct**: a `POST /webhooks/razorpay` endpoint
(verified with the webhook secret) marks orders paid even if the user's
browser dies after paying — the reason real systems never trust only the
client callback. Mention this in interviews even if you skip building it.

## What stays exactly the same

Inventory holds, the 10-minute expiry sweeper, idempotency keys, ticket
issuance, check-in, analytics — payment is a leaf dependency by design.
