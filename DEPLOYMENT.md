# Production Deployment Security Checklist

A pre-flight you MUST run through before the URL goes public. Each item below is **non-negotiable**.

> Status legend: `[ ]` = TODO before launch · `[x]` = enforced by code/config already

---

## 1 · Secrets

- [ ] `AUTH_SECRET` is a fresh 64-char random base64url value — DIFFERENT from staging, DIFFERENT from any value ever committed
  - Generate: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`
- [ ] `AUTH_SECRET` stored in Vercel's Environment Variables UI, not in any file
- [ ] `SEED_ADMIN_PASSWORD` is a 16+ char, generator-random value (not "ChangeMeBeforeDeploy!" or anything else from any docs)
- [ ] `DATABASE_URL` uses a **non-superuser** Postgres role with the minimum grants for the app schema
- [ ] No environment variable is logged on boot
- [ ] [x] App refuses to start with a weak AUTH_SECRET (length + entropy check in `lib/auth.ts`)
- [ ] [x] Seed refuses default password in production (`NODE_ENV=production`)

## 2 · TLS / transport

- [ ] Site is reachable ONLY over HTTPS. HTTP scheme redirects 301 to HTTPS (Vercel does this automatically with a custom domain configured)
- [ ] [x] `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` set by Next config in prod
- [ ] Domain submitted to https://hstspreload.org (optional but recommended)
- [ ] No mixed content — every asset on `/admin/*` loads over HTTPS

## 3 · Headers

- [ ] [x] Content-Security-Policy set
- [ ] [x] Permissions-Policy denies camera, microphone, geolocation, payment, USB, Bluetooth, cohorts
- [ ] [x] Referrer-Policy: strict-origin-when-cross-origin
- [ ] [x] X-Content-Type-Options: nosniff
- [ ] [x] Cross-Origin-Opener-Policy: same-origin
- [ ] [x] Cross-Origin-Resource-Policy: same-origin
- [ ] [x] `X-Robots-Tag` + `Cache-Control: private, no-store` for `/admin/*`
- [ ] Verify with https://securityheaders.com (target grade: A)

## 4 · Auth

- [ ] [x] Cookie is HttpOnly + Secure + SameSite=Strict
- [ ] [x] JWT signed with HS256 + AUTH_SECRET ≥32 chars and ≥96 bits entropy
- [ ] [x] Login throttle 5/IP/5min (in-memory)
- [ ] [x] DB-backed account lockout after 5 consecutive failures (15 min)
- [ ] [x] Constant-time bcrypt compare on unknown email
- [ ] [x] bcrypt cost 12 (transparent rehash on login for legacy hashes)
- [ ] [x] Open-redirect defense on `?next=` (login form sanitizes via `safe-redirect.ts`)
- [ ] CSRF protection live on every state-changing admin API (`Sec-Fetch-Site` + Origin/Referer fallback)
- [ ] First admin user has been logged in, their default password rotated, and `SEED_ADMIN_PASSWORD` env var removed from the production secret store after first deploy
- [ ] Operator team has been audited — only people who need access have accounts

## 5 · Database

- [ ] Connection uses `?sslmode=require` (or stronger)
- [ ] App role granted ONLY `SELECT/INSERT/UPDATE/DELETE` on the app schema — no DDL, no superuser
- [ ] Migration role is separate from runtime role (run `prisma migrate deploy` as a higher-privileged role then drop those grants)
- [ ] Automated daily backups enabled at the provider level
- [ ] Backups encrypted at rest
- [ ] Backup restore has been tested end-to-end at least once
- [ ] Postgres `pg_stat_statements` enabled for slow-query observability
- [ ] Connection limit configured (Prisma connection_limit ≤ provider max)

## 6 · File storage

- [ ] [x] Prescription files stored OUTSIDE `public/`
- [ ] [x] Filename derived from server-side random bytes, not user input
- [ ] [x] Magic-byte validation rejects MIME spoofing
- [ ] [x] Files served only via authenticated route, never statically
- [ ] [x] `Content-Disposition: attachment` + `nosniff` on download response
- [ ] On managed object storage (S3 / R2): bucket is **private**, no public ACLs, no public-read default
- [ ] Storage bucket policy denies cross-account access
- [ ] Storage encryption-at-rest enabled (SSE-S3 minimum, SSE-KMS preferred)
- [ ] Consider async ClamAV / VirusTotal scan post-upload — quarantine on hit

## 7 · Audit + observability

- [ ] [x] AuditLog table exists; service inserts on every PHI event
- [ ] [x] Audit `meta` blob has no raw PHI (only IDs + masked identifiers)
- [ ] Log destination wired to a managed service (Vercel Logs, Logtail, Axiom, Datadog)
- [ ] Alert on:
  - [ ] `LOGIN_LOCKED` event spikes (credential stuffing)
  - [ ] `CSRF_REJECTED` event spikes (someone probing)
  - [ ] `RATE_LIMIT_HIT` event spikes
  - [ ] 5xx rate above baseline
- [ ] Retention configured — audit log retained ≥7 years (pharmacy regulatory min in India), app log per provider default
- [ ] Audit log is also exported to an append-only store (S3 / Cloud Logging) so a DB compromise can't rewrite history

## 8 · Dependency / supply chain

- [ ] `npm audit` clean (no High/Critical) at deploy time — wire into CI
- [ ] Dependabot enabled on the GitHub repo
- [ ] GitHub secret scanning enabled (Settings → Code security)
- [ ] Push protection enabled to reject commits with high-confidence secrets
- [ ] All Prisma migrations reviewed by a second person before `prisma migrate deploy` in prod
- [ ] No `node_modules` or build artifacts in the repo (already covered by `.gitignore`)

## 9 · CI/CD security

- [ ] Production deploys gated on a green CI run that includes:
  - [ ] `npm ci` (clean install)
  - [ ] `npx tsc --noEmit` (type-check)
  - [ ] `npm run lint`
  - [ ] `npm audit --audit-level=high` (or `--production`)
  - [ ] `npm run build` (ensure prod build succeeds)
- [ ] Deployment requires approval from at least one other team member
- [ ] Production environment variables are NOT readable in build logs

## 10 · Operational

- [ ] On-call contact documented for the runtime hosts (Vercel and Render)
- [ ] Incident response runbook drafted (who to call, what to capture, how to rotate AUTH_SECRET fast)
- [ ] AUTH_SECRET rotation procedure tested in staging (rotating invalidates all sessions — that's intentional)
- [ ] Privacy notice and patient consent flow exists at the storefront (`/privacy` page) — required by DPDP Act 2023
- [ ] Breach notification template prepared (CERT-In requires reporting within 6 hours of incident detection per current rules)

---

## Quick verification (after deploy)

```bash
# Headers grade
curl -s -I https://your-domain.example/admin/login | grep -iE 'content-security|strict-transport|referrer|frame|x-content|cache-control'

# CSRF should reject
curl -s -i -X POST https://your-domain.example/api/admin/customers \
  -H 'Content-Type: application/json' \
  -H 'Origin: https://evil.example.com' \
  -d '{"name":"x","phone":"9876543210"}'
# Expect: 403 Cross-site request rejected

# Login should require POST + valid creds (not 200 anonymously)
curl -s -o /dev/null -w '%{http_code}\n' https://your-domain.example/api/admin/customers
# Expect: 401 Unauthenticated

# Confirm no stack trace leaks on a forced error
# (deliberately malformed JSON)
curl -s -X POST https://your-domain.example/api/admin/auth/login \
  -H 'Content-Type: application/json' \
  -d 'not json' | jq
# Expect a tidy `{"error":"...","requestId":"..."}` — never a stack trace
```

---

## What this checklist is NOT

It does not cover:

- Physical security of operator workstations.
- Network ACLs on the database provider (if you're not on a managed Postgres with default-private VPC, ask "why" and fix it).
- HIPAA-equivalent BAAs with subprocessors — that's a contracts conversation, not a code one.

If a customer asks "are you HIPAA compliant," the honest answer is: *the application is structured around HIPAA principles (audit log, least privilege, encryption in transit, breach detection), but full compliance is an organizational program, not a config flag. This checklist is one piece.*
