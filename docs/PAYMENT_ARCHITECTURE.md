# Payment Architecture

> **Status: in progress on `feat/payments`. TEST MODE ONLY. Not merged to `main`.**
> No real money flows until the full lifecycle is verified against Razorpay test
> mode and explicitly approved for merge.

This document is the contract for the payment subsystem: the phased plan, the
security model, and how settlement actually works. Companion docs (to be added
as phases land): `PAYMENT_FLOW.md`, `SECURITY_IMPLEMENTATION.md`.

---

## How settlement actually works (read this first)

Razorpay is a payment **aggregator**, not a UPI relay:

1. You onboard as a merchant and complete **KYC** (PAN, business proof, bank account).
2. Razorpay gives you a `KEY_ID` (public) + `KEY_SECRET` (server-only).
3. Customers pay via card / UPI / net-banking through Razorpay Checkout.
4. Razorpay collects the money and **settles to your registered bank account**
   (T+2 by default).

A raw UPI VPA (e.g. `vitthal.misal@ybl`) is **not** a code value. To receive
money into the account behind that UPI, register **that account's bank details**
as your Razorpay settlement account. The only way to use the VPA directly is a
UPI intent/QR, which **cannot be securely auto-verified** (no signature, no
webhook) — so it's incompatible with the security bar this project requires.

---

## Phased delivery

Each phase is a reviewable step on `feat/payments`, test-mode, verified before
the next.

| Phase | Scope | Status |
|---|---|---|
| **1. Customer auth** | Accounts (email/phone + password), bcrypt, sessions, lockout, rate-limit, protected `/checkout`, login/signup UI | ✅ **done (this branch)** |
| **2. Orders + inventory** | Real stock model, atomic decrement + row locking, storefront order-create API, order persistence | ⏳ next |
| **3. Razorpay core** | `create-order`, `verify` (HMAC signature), webhook (signature + idempotency), `Payment` / `PaymentAttempt` models | ⏳ |
| **4. Reservation timer** | DB-timestamp 5-min hold, auto-cancel + stock restore sweep, accurate across refresh/tabs | ⏳ |
| **5. Checkout UX** | Countdown, retry, trust badges, success / failure / pending pages | ⏳ |
| **6. Admin payments** | Successful / failed / expired / pending dashboards, reconciliation | ⏳ |
| **7. Docs + tests** | `PAYMENT_FLOW.md`, `SECURITY_IMPLEMENTATION.md`, integration + timer-expiry tests | ⏳ |

---

## Security model (applies to every phase)

| Threat | Control |
|---|---|
| Client lies "payment succeeded" | Server verifies the Razorpay **HMAC signature** before marking paid; the browser callback alone never changes order state |
| Webhook spoofing | Verify `X-Razorpay-Signature` against `RAZORPAY_WEBHOOK_SECRET` on every webhook; reject mismatches |
| Replay / double-pay | Idempotency key + UNIQUE constraint on `razorpayPaymentId`; a second verify of the same payment is a no-op |
| Amount tampering | Order total is **recomputed server-side** from the cart; the client-supplied amount is never trusted |
| Stock oversell race | Reservation runs in a `prisma.$transaction` with `SELECT … FOR UPDATE` row locks |
| Timer manipulation | Expiry is a **DB timestamp** enforced server-side; the frontend countdown is cosmetic |
| Secret leakage | `KEY_SECRET` + `WEBHOOK_SECRET` are server-only env vars, never in the client bundle, never in git |
| Anonymous checkout | `/checkout` (and the payment routes) require a customer session — enforced in middleware **and** re-checked in handlers |

---

## Phase 1 — Customer auth (delivered on this branch)

### What it adds
- **Accounts on the existing `Customer` row.** The patient record and the login
  account are the same row, so order history + dispensary timeline stay unified.
  Self-signup sets `passwordHash`; admin-created walk-ins have it null and can't
  log in until they claim the account.
- **Login by email OR 10-digit mobile** + password, classified server-side.
- **Separate session namespace** — `ambica_cust_sess` cookie (HttpOnly,
  SameSite=Lax, 7-day JWT via `jose`), distinct from the staff `ambica_admin_sess`.
- **Brute-force defense** — IP rate-limit + bcrypt (cost 12) + DB lockout
  (5 failures → 15-min lock) + uniform error messages (no account enumeration).
- **Protected checkout** — middleware redirects anonymous `/checkout` visits to
  `/login?next=/checkout`.
- **Audit** — `CUSTOMER_SIGNUP / LOGIN_SUCCESS / LOGIN_FAILURE / LOGIN_LOCKED /
  LOGOUT` appended to the immutable log.

### Files
```
prisma/migrations/20260520000000_customer_accounts/   email-unique + auth columns
src/lib/customer-auth.ts                               session sign/verify/cookies
src/features/auth/schemas.ts                           Zod (signup, login, reset)
src/features/auth/AuthForms.tsx                         login + signup client forms
src/app/api/auth/{signup,login,logout,me}/route.ts     auth API
src/app/{login,signup}/page.tsx                         storefront auth pages
src/middleware.ts                                       /checkout gate
```

### Endpoints
| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/auth/signup` | none | Create account (email/phone + password) → auto-login |
| `POST` | `/api/auth/login` | none | Sign in by email or mobile |
| `POST` | `/api/auth/logout` | session | Clear session |
| `GET` | `/api/auth/me` | session | Current customer (re-fetched; soft-deleted = 401) |

### Still to wire (Phase 1 tail)
- **Forgot / reset password** — schema + token columns exist; delivery needs a
  transactional email/SMS provider (deliberately not stubbed with fake sends).

---

## Deployment note

This branch adds a migration (`20260520000000_customer_accounts`). When merged,
run `npm run deploy:db` against production **before** the app deploy, so the new
columns exist before the new code references them. The migration is additive and
backwards-compatible (all new columns nullable / defaulted).
