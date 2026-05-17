# Security Policy

Ambica Medical is a healthcare application handling Protected Health Information (PHI). It must be operated with the controls described below. This document is the source of truth for the application's security model.

---

## Reporting a vulnerability

**Do not** open a public GitHub issue for security findings.

Email **security@ambicamedical.in** (or directly to the codebase owner) with:

1. A description of the issue.
2. Steps to reproduce.
3. The impact you believe it has.
4. Any proof-of-concept payload (sanitized).

You should expect:

- An acknowledgement within **72 hours**.
- A patched release or mitigation plan within **14 days** for High/Critical severity.
- Public credit in the release notes if you want it.

We will not pursue legal action against good-faith security research that follows this disclosure process.

---

## Threat model

| Asset | Sensitivity |
|---|---|
| **Patient identifiers** (name, phone, email, DOB, address, notes) | High — PHI |
| **Prescription scans** (images / PDFs) | Very High — PHI |
| **Medicine dispensing records** (`MedicineEntry`) | High — PHI |
| **Orders + payment method** | Medium — financial |
| **Staff credentials** | High — auth boundary |
| **Audit log** | Very High — compliance/forensic |
| **AUTH_SECRET** | Critical — full account takeover if leaked |

Primary in-scope attacker profiles:

1. **Anonymous internet attacker** — only reachable surface is the storefront pages and the login endpoint.
2. **Authenticated pharmacist (insider abuse)** — least-privilege controls, audit log accountability.
3. **Compromised dependency / supply-chain attack** — limited by CSP, minimal third-party scripts, no untrusted iframes.

Out of scope:

- Physical security of the pharmacy machine.
- DDOS — mitigated by the platform layer (Vercel / Render), not by the app.

---

## Defense layers (in request order)

```
   ╔════════════════════════════════════════════════════════════════╗
   ║                    Browser → Vercel Edge                       ║
   ║                                                                ║
   ║  HSTS · CSP · X-Content-Type-Options · Referrer-Policy · COOP  ║
   ║  Permissions-Policy · X-Frame-Options (via CSP frame-ancestors)║
   ╚════════════════════════════════════════════════════════════════╝
                              │
                              ▼
   ╔════════════════════════════════════════════════════════════════╗
   ║                  next.js edge middleware                       ║
   ║                                                                ║
   ║  • request-id minting (correlation)                            ║
   ║  • CSRF: Origin/Referer/Sec-Fetch-Site on state-changing API   ║
   ║  • session JWT verification (jose, HS256)                      ║
   ║  • auth redirect (UI) / 401 (API)                              ║
   ║  • x-user-id + x-user-role headers downstream                  ║
   ╚════════════════════════════════════════════════════════════════╝
                              │
                              ▼
   ╔════════════════════════════════════════════════════════════════╗
   ║                    route handler                               ║
   ║                                                                ║
   ║  • requireRole(...)  — re-fetches user, checks active+role     ║
   ║  • Zod .strict() schema validation (mass-assignment defense)   ║
   ║  • safeError envelope (no stack-trace leakage in prod)         ║
   ║  • audit log entry for every PHI access (read or write)        ║
   ╚════════════════════════════════════════════════════════════════╝
                              │
                              ▼
   ╔════════════════════════════════════════════════════════════════╗
   ║                    service layer (Prisma)                      ║
   ║                                                                ║
   ║  • parameterized queries (no raw SQL anywhere)                 ║
   ║  • transactional multi-row writes                              ║
   ║  • scope-guarded mutations (`where: { id, customerId }`)       ║
   ║  • FK constraints as a hard backstop                           ║
   ╚════════════════════════════════════════════════════════════════╝
```

---

## Authentication

| Component | Choice |
|---|---|
| Algorithm | HS256 JWT signed with `AUTH_SECRET` (≥32 chars, entropy ≥96 bits) |
| Storage | HttpOnly + Secure (prod) + SameSite=**Strict** cookie |
| Lifetime | 8 hours |
| Password hash | **bcrypt** with cost **12** |
| Login throttle | 5 attempts / IP / 5 min (in-memory; swap for Redis in multi-instance) |
| Account lockout | 5 consecutive failures → account locked 15 min (DB-backed) |
| Constant-time login | Dummy bcrypt compare runs even on unknown email |
| Rehash on login | Hashes below the current cost are silently upgraded |
| Session revocation | `User.active = false` invalidates JWTs at next request |

### Password rotation

- The seed in `prisma/seed.ts` rotates the password on re-run (does NOT change role or re-activate).
- For self-service password reset, use a separate flow (not currently implemented — a password-reset feature would need email/SMS verification and is tracked as future work).

---

## Authorization

**Three roles**, hierarchical (`PHARMACIST < MANAGER < ADMIN`):

| Action | Min role |
|---|---|
| View customers, prescriptions, orders | PHARMACIST |
| Create / edit customers, log medicines, upload Rx | PHARMACIST |
| **Delete (soft-delete) a customer** | MANAGER |
| Promote/demote users (no UI yet, DB direct only) | ADMIN |

`requireRole()` is called from every route handler — the middleware-level check is only the first layer.

---

## Audit log

`AuditLog` is **append-only** by application code (only inserts, no updates, no deletes).

Captured events:

```
LOGIN_SUCCESS · LOGIN_FAILURE · LOGIN_LOCKED · LOGOUT
CUSTOMER_CREATE · CUSTOMER_VIEW · CUSTOMER_UPDATE · CUSTOMER_DELETE
PRESCRIPTION_CREATE · PRESCRIPTION_VIEW · PRESCRIPTION_FILE_DOWNLOAD
MEDICINE_ENTRY_CREATE · MEDICINE_ENTRY_UPDATE · MEDICINE_ENTRY_DELETE
ORDER_CREATE · ORDER_UPDATE
CSRF_REJECTED · RATE_LIMIT_HIT · AUTH_DENIED
```

Each row records: timestamp, action, actor id + email snapshot, target type + id, source IP, user-agent (truncated), request-id (for log correlation), and a JSON `meta` blob.

**`meta` MUST never contain raw PHI** — only ids, masked identifiers (`a***@example.com`, `98******10`), and outcome data. The audit service comment documents this rule.

---

## File upload security (prescriptions)

1. **Size cap** — `MAX_FILE_SIZE` enforced before buffering.
2. **MIME allowlist** — only `image/jpeg`, `image/png`, `image/webp`, `application/pdf`.
3. **Magic-byte validation** — file *contents* must match the declared MIME (`lib/security/file-validation.ts`). Defeats polyglot / HTML-in-image attacks.
4. **Random storage key** — 16 random bytes hex; never derived from user input → no path traversal possible.
5. **Storage outside `public/`** — bytes are never statically served. Only a separate auth-gated route streams them.
6. **`Content-Disposition: attachment`** + **`X-Content-Type-Options: nosniff`** — browsers will download rather than render, even if a malicious file somehow slipped through.
7. **Orphan cleanup** — if the DB insert after file write fails, the stored bytes are removed.
8. **PHI access audited** — every download writes a `PRESCRIPTION_FILE_DOWNLOAD` row.

---

## CSRF protection

State-changing requests under `/api/admin/*` are checked at the edge middleware:

1. `Sec-Fetch-Site` header — accept `same-origin` / `same-site` / `none`.
2. Fall back to `Origin` header — must match `host`.
3. Fall back to `Referer` — same check.
4. No Origin and no Referer → reject 403.

Login (`/api/admin/auth/login`) is exempt because no session exists yet; brute-force defenses cover it.

This is **in addition to** the `SameSite=Strict` cookie — belt + braces.

---

## Headers (set by `next.config.mjs`)

Applied to every response:

```
Content-Security-Policy:
  default-src 'self'; base-uri 'self';
  script-src 'self' 'unsafe-inline';                  ← Next.js runtime
  style-src  'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src    'self' data: https: blob:;
  font-src   'self' data: https://fonts.gstatic.com;
  connect-src 'self';
  frame-ancestors 'none';                             ← clickjacking
  form-action 'self';
  object-src 'none';
  upgrade-insecure-requests
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), ...
X-Content-Type-Options: nosniff
X-DNS-Prefetch-Control: off
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload  (prod only)
```

Additionally for `/admin/*` and `/api/admin/*`:

```
X-Robots-Tag: noindex, nofollow, noarchive, nosnippet
Cache-Control: private, no-store, max-age=0
```

---

## Logging and PII hygiene

- All app logs are JSON lines via `lib/logger.ts`.
- `maskEmail()` / `maskPhone()` helpers exist for any log line that needs an identifier.
- **No raw PHI** ever lands in app logs. Audit log rows record IDs, not values.
- `console.log` is NOT used anywhere in the codebase (grep confirms).

---

## Data at rest

| | |
|---|---|
| Postgres | Provider-encrypted disk (Render / Neon / managed). For local dev, OS-level disk encryption is the operator's responsibility. |
| Prescription files | Stored with mode `0600` on disk under `.private/`. For multi-instance prod, swap `lib/storage.ts` to an object store with bucket policies + SSE-KMS. |
| Backups | Encrypted by the managed provider. App-level: ensure `pg_dump` files are also encrypted (e.g. piped through `age`/`gpg` before upload). |

---

## Production deployment checklist

See [DEPLOYMENT.md](./DEPLOYMENT.md).

---

## Known residual risks (post-hardening)

| Item | Why it remains | Recommended next step |
|---|---|---|
| In-memory rate limiter doesn't sync across serverless instances | Out-of-scope for a single-pharmacy MVP; would require Redis/Upstash | Add Upstash KV as the rate-limit backend |
| No 2FA | Not yet implemented | Add TOTP for admins (otpauth + speakeasy or jose-only impl) |
| No password-reset self-service | Same | Email/SMS verification flow |
| No malware scan on uploads | ClamAV / VirusTotal aren't free / are heavy | Add async ClamAV scan post-upload; quarantine if hit |
| Notification stubs only send "queued" | Provider not configured | Wire Twilio/MSG91 + Resend |
| Audit log is in the same DB | A DB compromise could rewrite it via direct connection | Push audit-log rows to a write-once log store (CloudWatch / Loki / Vector → S3) |

---

## License & data handling

This codebase is private property of Ambica Medical, Aurangabad. Patient data handled by this application is governed by Indian law (IT Act 2000, Digital Personal Data Protection Act 2023). Operators are responsible for:

- Obtaining patient consent for data processing.
- Retaining audit logs per regulatory minimum (typically 7 years for pharmacy records in India).
- Reporting data breaches to CERT-In and the affected data principals per DPDP Act timelines.
