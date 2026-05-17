# Deploy guide — Vercel (app) + Render (database)

This guide gets you from a fresh GitHub repo to a live, hardened production deploy in about **15 minutes**.

> **Architecture reminder:** the API routes (`/api/admin/*`) and the React pages are the **same** Next.js app. They deploy together to Vercel. Render hosts the PostgreSQL database, nothing else.

---

## What you'll have when you're done

```
                    ┌──────────────────────────────┐
                    │     YOUR DOMAIN              │
                    │     (or *.vercel.app)        │
                    └──────────────┬───────────────┘
                                   │ HTTPS
                                   ▼
            ┌──────────────────────────────────────────┐
            │            Vercel (Singapore region)     │
            │                                          │
            │   ┌────────────────────────────────────┐ │
            │   │  Next.js 16 app                    │ │
            │   │   • Storefront pages (/)           │ │
            │   │   • Admin pages (/admin/*)         │ │
            │   │   • API routes (/api/admin/*)      │ │
            │   │   • Middleware (auth + CSRF)       │ │
            │   └────────────────┬───────────────────┘ │
            └────────────────────┼─────────────────────┘
                                 │ Postgres TLS (sslmode=require)
                                 ▼
            ┌──────────────────────────────────────────┐
            │       Render Postgres (Singapore)        │
            │       database: `ambica`                 │
            │       user: `ambica` (non-superuser)     │
            └──────────────────────────────────────────┘
```

---

## Step 1 — Provision the database on Render (3 minutes)

### Click this link

**👉 https://render.com/deploy?repo=https://github.com/Vitthal38/ambica-medical**

This opens Render's Blueprint launcher with `render.yaml` from the repo pre-loaded.

### In the Render UI

1. Sign in (or create an account — free).
2. Render shows the resources from `render.yaml`:
   - One **Postgres database** named `ambica-postgres`.
3. Click **Apply**.
4. Wait ~60 seconds for the status to flip from "Creating" to **"Available"**.

### Grab the connection string

1. Click the `ambica-postgres` database in your Render dashboard.
2. Scroll to the **Connections** section.
3. Copy the **External Database URL** (the one ending in `.render.com`, NOT `.render-vpc-internal`).

It looks like:

```
postgresql://ambica:abcXYZ_lots_of_random@dpg-xxxxxxxx-a.singapore-postgres.render.com/ambica
```

Append `?sslmode=require` to the end if not already there:

```
postgresql://ambica:abcXYZ...@dpg-xxxxxxxx-a.singapore-postgres.render.com/ambica?sslmode=require
```

**Keep this URL handy** — you'll paste it into Vercel in Step 2.

---

## Step 2 — Deploy the app on Vercel (8 minutes)

### Click this link

**👉 https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FVitthal38%2Fambica-medical&project-name=ambica-medical&repository-name=ambica-medical&env=DATABASE_URL,AUTH_SECRET,SEED_ADMIN_EMAIL,SEED_ADMIN_PASSWORD&envDescription=See%20.env.example%20for%20constraints.%20AUTH_SECRET%20must%20be%20%E2%89%A532%20chars%20with%20real%20entropy.&envLink=https%3A%2F%2Fgithub.com%2FVitthal38%2Fambica-medical%2Fblob%2Fmain%2F.env.example**

This opens Vercel's import flow with the repo pre-selected and the required env vars listed.

### In the Vercel UI

1. **Sign in to Vercel** with GitHub (use the same account that owns the repo).

2. **Choose a team / scope.** Personal Hobby tier is fine to start.

3. **Project name:** `ambica-medical` (already filled in).

4. **Framework preset:** Vercel auto-detects **Next.js**. Leave as-is.

5. **Root directory:** leave at `.` (repo root).

6. **Build & Output settings:**
   - Build Command: leave default (Vercel reads it from `package.json` → it'll run `prisma generate && prisma migrate deploy && next build`). ✓ This automatically applies migrations to your fresh database on first deploy.
   - Output Directory: leave default.
   - Install Command: leave default. ✓ Runs `postinstall: prisma generate`.

7. **Environment Variables** — fill these four:

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | Paste the Render external URL from Step 1 (ending with `?sslmode=require`) |
   | `AUTH_SECRET` | Generate a fresh secret — see below |
   | `SEED_ADMIN_EMAIL` | `admin@ambicamedical.in` (or your real admin email) |
   | `SEED_ADMIN_PASSWORD` | A 16+ char strong password — see below |

   **Generate AUTH_SECRET locally:**

   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
   ```

   Paste the output. The app **will refuse to start** with a low-entropy secret — this is intentional.

   **Generate SEED_ADMIN_PASSWORD locally:**

   ```bash
   node -e "console.log(require('crypto').randomBytes(16).toString('base64url'))"
   ```

   **Write down both values somewhere safe — you'll need them.**

8. Click **Deploy**.

9. Wait ~3–4 minutes for the build. Vercel runs:
   - `npm install` (then `prisma generate`)
   - `prisma migrate deploy` → applies all migrations to your Render database
   - `next build` → compiles the app

10. When done, Vercel shows a `*.vercel.app` URL. Click it.

You should see the Ambica Medical storefront. **Live.** 🎉

---

## Step 3 — Seed the admin user (2 minutes)

The database now has the schema but **no admin user**. Easiest way to seed it: run the seed locally pointing at the production DB.

```bash
# In your local checkout
cd ambica-medical

# Use the prod DATABASE_URL just for this one command
DATABASE_URL="postgresql://ambica:...@dpg-xxxxxxxx-a.singapore-postgres.render.com/ambica?sslmode=require" \
SEED_ADMIN_EMAIL="admin@ambicamedical.in" \
SEED_ADMIN_PASSWORD="YourStrongPasswordHere" \
NODE_ENV="production" \
npm run prisma:seed
```

You should see:

```
✓ Admin user ready: admin@ambicamedical.in
✓ Synced 516 medicines from catalog.
```

> The seed refuses to run with the default/weak password when `NODE_ENV=production` — this is a deliberate guardrail.

---

## Step 4 — Sign in and verify (2 minutes)

1. Open your Vercel URL: `https://ambica-medical-xxxx.vercel.app/admin/login`
2. Sign in with the admin email + password you used in Step 3.
3. You should land on the dashboard.

### Quick security verification (paste into your terminal)

```bash
SITE="https://ambica-medical-xxxx.vercel.app"     # ← your URL

# A: All security headers present?
curl -s -I "$SITE/admin/login" | grep -iE 'content-security|strict-transport|x-content|cache-control|x-robots'

# B: CSRF rejects cross-origin POST?
curl -s -i -X POST "$SITE/api/admin/customers" \
  -H 'Content-Type: application/json' \
  -H 'Origin: https://evil.example.com' \
  -d '{"name":"x","phone":"9876543210"}' | head -3
# Expect: HTTP/2 403 Cross-site request rejected

# C: Unauthenticated API returns 401?
curl -s -o /dev/null -w '%{http_code}\n' "$SITE/api/admin/customers"
# Expect: 401
```

If any of these don't behave as expected, **stop and investigate** — don't put real patient data in until they all pass.

---

## Custom domain (optional)

In the Vercel dashboard: **Project → Settings → Domains → Add**. Vercel handles the TLS certificate (Let's Encrypt). HSTS will activate as soon as the domain serves over HTTPS.

---

## Future deploys

After this initial setup, every push to the `main` branch on GitHub auto-deploys to Vercel:

```bash
git add .
git commit -m "your change"
git push
```

Vercel runs `prisma migrate deploy && next build` on every deploy. New migrations apply automatically.

**Be careful** — destructive migrations (DROP COLUMN, etc.) will execute against prod. Always test in a Vercel preview branch first.

---

## Troubleshooting

**Build fails: "AUTH_SECRET has insufficient entropy"**
Your AUTH_SECRET is too predictable. Regenerate with `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` and paste the fresh value.

**Build fails: "Can't reach database server"**
Your `DATABASE_URL` is wrong, your Render database isn't `available` yet, or you used the *internal* URL instead of the *external* one. Internal URLs only work inside Render's VPC; Vercel functions can't see them.

**Login returns 500 in production but works locally**
Look at Vercel's build logs first. Most often: missing `?sslmode=require` in the DATABASE_URL. Render Postgres requires TLS.

**Login returns 401 with the right password**
You probably ran the seed against the wrong database, OR the production seed refused your weak password. Re-run the seed against the Render URL with a 12+ char password.

**5xx after a code push**
Vercel keeps the previous deployment. In **Project → Deployments**, find the last good deploy and click **Promote to Production**.

**I need to rotate AUTH_SECRET right now**
1. Generate a new value as above.
2. Vercel → Project → Settings → Environment Variables → edit AUTH_SECRET.
3. Vercel → Deployments → trigger a new deploy (or push an empty commit).
4. Every active session is invalidated; all users must sign in again. This is intentional.

---

## What this guide does NOT do

- It doesn't set up email/SMS providers for the notification stubs in `src/lib/notifications.ts` — those still return `status: 'queued'` until you wire Twilio/MSG91/Resend.
- It doesn't move prescription file storage off Vercel's ephemeral filesystem. **You MUST replace `src/lib/storage.ts` with an object-store implementation (S3 / R2 / Vercel Blob) before serving real prescriptions** — Vercel functions have ephemeral disk, so a local-FS write will be lost between invocations.
- It doesn't configure backups beyond Render's default daily snapshots. See `DEPLOYMENT.md` for the full production checklist.
