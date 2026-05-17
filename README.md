<div align="center">

# Ambica Medical

**Healthcare, Reimagined — Aurangabad's licensed online pharmacy.**

A full-stack pharmacy platform with a customer-facing storefront and a staff-only CRM/dispensary back office.
Built on Next.js 16 (App Router), React 19, Prisma + PostgreSQL, and TypeScript end-to-end.

[Tech](#-tech-stack) · [Features](#-features) · [Getting started](#-getting-started) · [Architecture](#-architecture) · [API](#-api-reference) · [Data model](#-data-model) · [Security](./SECURITY.md) · [Deploy](./DEPLOY.md)

</div>

---

## 🌐 Live

The project is currently deployed at **[ambica-medical.vercel.app](https://ambica-medical.vercel.app)**.

- **Storefront** is publicly browsable.
- **Admin panel** at `/admin/login` is restricted to authorized pharmacy staff. Access is provisioned out-of-band — see the [Security](./SECURITY.md) policy.

Infrastructure:
- App: Vercel (deploys auto-trigger on push to `main`)
- Database: Render PostgreSQL 16

---

## 🚀 Deploy your own

**Two-click deploy:** the database goes to Render, the app to Vercel.

[![Deploy database to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Vitthal38/ambica-medical) &nbsp;
[![Deploy app to Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FVitthal38%2Fambica-medical&project-name=ambica-medical&repository-name=ambica-medical&env=DATABASE_URL,AUTH_SECRET,SEED_ADMIN_EMAIL,SEED_ADMIN_PASSWORD&envDescription=See%20.env.example%20for%20constraints.%20AUTH_SECRET%20must%20be%20%E2%89%A532%20chars%20with%20real%20entropy.&envLink=https%3A%2F%2Fgithub.com%2FVitthal38%2Fambica-medical%2Fblob%2Fmain%2F.env.example)

See **[DEPLOY.md](./DEPLOY.md)** for the 15-minute step-by-step (Render database → Vercel app → seed → verify). Production-hardening checklist lives in **[DEPLOYMENT.md](./DEPLOYMENT.md)**.

---

## ✨ Features

### Storefront (public)
- **Landing page** — hero, category tiles, featured medicines, prescription-upload promo, why-us, delivery & store info
- **Catalog** with text search and category filter chips (URL-synced state)
- **Product details** with quantity selector, MRP/discount display, and related items
- **Cart** with quantity controls, totals, free-delivery progress bar (persists across reloads via Zustand → localStorage)
- **Checkout** — contact, delivery vs store pickup, address, order summary, place-order action
- **Prescription upload flow** — 4-step wizard (file → patient → review → dispatch) writing to a private storage volume outside `public/`
- **Order tracking** at `/order/[id]` with a printable variant at `/order/[id]/print`
- **Order history** at `/orders`

### Admin CRM (`/admin/*`, behind auth)
- **Dashboard** — at-a-glance recent customers and activity
- **Customer management** — list, search, create (with **optional initial medicines** logged in the *same* Postgres transaction), edit (including inline **timeline editing** with per-row PATCH/DELETE), soft-delete
- **Prescription records** — upload Rx images/PDFs, link to a customer, track issue/expiry dates
- **Medicine timeline** per customer — combines order purchases AND directly-recorded medicines (Manual / OTC / Prescription types)
- **Order management** — list and view all storefront orders
- **Refill reminders** — pending reminders surfaced on the customer profile
- **Catalog** — 516-medicine seed sourced from `docs/medicines_500.csv`

### Auth & security
- JWT sessions in HTTP-only, SameSite cookies signed via `jose`
- **Edge middleware** (`src/middleware.ts`) gates every `/admin/*` and `/api/admin/*` route
- **Defense in depth** — route handlers re-check session + role (`requireRole('PHARMACIST')`) before any write
- **Scope-guarded** mutations — e.g. `PATCH /api/admin/customers/:id/medicine-entries/:entryId` rejects with 404 if the entry doesn't belong to the customer in the URL
- Passwords hashed with `bcryptjs`
- Prescription uploads stored under `.private/prescriptions/` — **never** served by Next's static handler

---

## 🛠 Tech stack

| Layer | Choice |
|---|---|
| Framework | **Next.js 16.2** (App Router, Turbopack) |
| UI | **React 19** + **TypeScript** |
| Styling | **Tailwind CSS 3.4** (`autoprefixer`, `postcss`) + `clsx` + `tailwind-merge` |
| Icons / motion | `lucide-react`, `framer-motion` |
| Database | **PostgreSQL 18** (native) |
| ORM | **Prisma 5.22** — schema-first, migrations in `prisma/migrations/` |
| Auth | JWT (`jose`) in HTTP-only cookie + `bcryptjs` for password hashing |
| Forms / validation | `react-hook-form` + **Zod 4** schemas (shared client + server) |
| Data fetching | `@tanstack/react-query` (used selectively — most reads are RSC) |
| Client state | `zustand` (cart, UI) |
| Seed runner | `tsx` |
| Fonts | Inter via `next/font/google` (zero layout shift) |

By design **not** using: Redux, tRPC/GraphQL, NextAuth, any CSS-in-JS, any UI component library (Radix/Shadcn) — custom primitives in `src/components/admin/ui.tsx`.

---

## 🚀 Getting started

### Prerequisites
- **Node.js 20+**
- **PostgreSQL 16/17/18** running locally on `5432` (or change the port in `.env`)
- **npm** (or your preferred package manager)

### 1. Install
```bash
git clone https://github.com/misalvitthal38/ambica-medical.git
cd ambica-medical
npm install
```

### 2. Configure env
```bash
cp .env.example .env
```
Then edit `.env`:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ambica?schema=public"
AUTH_SECRET="generate-a-random-48-byte-base64url-string-here"
SEED_ADMIN_EMAIL="admin@ambicamedical.in"
SEED_ADMIN_PASSWORD="ChangeMeBeforeDeploy!"
PRESCRIPTION_STORAGE_DIR=".private/prescriptions"
```

> Generate an auth secret:  `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`

### 3. Initialize the database
```bash
# Create the database (once)
psql -U postgres -c "CREATE DATABASE ambica;"

# Apply migrations
npx prisma migrate deploy

# Seed (1 admin user + 516 medicines from docs/medicines_500.csv)
npx prisma db seed
```

### 4. Run dev server
```bash
npm run dev
```
Open http://localhost:3000 (storefront) or http://localhost:3000/admin (sign in with your seeded admin).

### 5. Useful scripts
| Command | Purpose |
|---|---|
| `npm run dev` | Turbopack dev server, hot reload |
| `npm run build` | Production build → `.next/` |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint via Next defaults |
| `npm run prisma:studio` | Open Prisma Studio at `localhost:5555` |
| `npm run prisma:migrate` | Create + apply a new dev migration |
| `npx tsc --noEmit` | Type-check the whole project |

---

## 🧭 Architecture

### Routing (App Router conventions)

```
src/app/
├── layout.tsx              ← Root layout (Inter, Navbar, Footer, Providers)
├── page.tsx                ← /
│
├── products/               ← /products, /products/[id]
├── category/[slug]/        ← /category/diabetes-care, etc.
├── cart/                   ← /cart
├── checkout/               ← /checkout
├── order/[id]/             ← /order/[id], /order/[id]/print
├── orders/                 ← /orders
├── prescription/           ← /prescription (4-step Rx upload)
│
├── (admin-auth)/admin/login/   ← Public sign-in page (route group)
├── (admin)/admin/              ← Authenticated CRM (sidebar layout)
│   ├── layout.tsx                   Dashboard chrome + session re-check
│   ├── page.tsx                     /admin (dashboard)
│   ├── customers/                   /admin/customers/...
│   │   ├── new/page.tsx                  + NewCustomerForm (create + medicines, atomic)
│   │   └── [id]/                         Profile, edit, prescriptions
│   │       ├── edit/                          Customer edit + EditTimelineSection
│   │       └── prescriptions/new/             Upload prescription
│   ├── orders/                      /admin/orders
│   ├── prescriptions/               /admin/prescriptions, /admin/prescriptions/[id]
│   └── reminders/                   /admin/reminders
│
└── api/
    ├── (storefront routes)          checkout, cart actions
    └── admin/                       Auth-gated: customers, prescriptions,
                                     medicine-entries, medicines (search), orders
```

**Route groups** `(admin)` vs `(admin-auth)` separate the dashboard chrome (sidebar + session check) from the public login page — same URL prefix, different layouts.

### Layered server code

```
src/
├── features/admin/schemas.ts   ← Single source of truth for shapes (Zod).
│                                  Imported by API handlers AND React forms.
├── lib/
│   ├── db.ts                   ← Prisma client singleton
│   ├── auth.ts                 ← Session create/verify, cookie helpers
│   ├── api-auth.ts             ← requireRole() guard for route handlers
│   ├── validate.ts             ← parseJson(req, schema) → tagged Result
│   ├── cn.ts                   ← clsx + tailwind-merge helper
│   └── services/               ← Prisma access functions
│       ├── customers.ts             createCustomerWithMedicines (transactional)
│       ├── medicine-entries.ts      CRUD scoped to customerId
│       ├── orders.ts
│       └── prescriptions.ts
├── middleware.ts               ← Edge auth gate for /admin/*, /api/admin/*
└── components/
    ├── admin/                  Admin-only primitives (Sidebar, ui.tsx)
    └── layout/                 Public Navbar, Footer
```

### Defense in depth

| Layer | What it does |
|---|---|
| Edge middleware | Redirect un-authed UI → `/admin/login`, return 401 for API |
| Route handler `requireRole(...)` | Re-check session + role before any write |
| Prisma service | Scope-checks IDs (`findFirst({ where: { id, customerId } })`) before update/delete |
| Postgres FK constraints | Hard backstop for orphan/dangling refs |
| Zod schema | Validates payload shape before it ever touches Prisma |

### Atomicity

Customer-create-with-medicines and other multi-row writes use **`prisma.$transaction`** so partial saves never persist:

```ts
return prisma.$transaction(async (tx) => {
  const customer = await tx.customer.create({ data: { ... } });
  await tx.medicineEntry.createMany({ data: medicines.map(...) });
  return tx.customer.findUniqueOrThrow({
    where: { id: customer.id },
    include: { medicineEntries: { include: { medicine: true } } },
  });
});
```

If any `medicineId` is bogus, the whole transaction rolls back — the customer never lands in the DB.

---

## 🌐 API reference

All admin endpoints require a valid `ambica_admin_sess` cookie (set by `POST /api/admin/auth/login`) and an active session with role ≥ `PHARMACIST`.

### Auth

| Method | Path | Body | Purpose |
|---|---|---|---|
| `POST` | `/api/admin/auth/login` | `{ email, password }` | Creates session, sets cookie |
| `POST` | `/api/admin/auth/logout` | — | Clears cookie, 303-redirects to `/` |

### Customers

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/admin/customers` | `?q=...&limit=...&cursor=...` |
| `POST` | `/api/admin/customers` | Optionally accepts `medicines: [...]` — atomic |
| `GET` | `/api/admin/customers/:id` | |
| `PATCH` | `/api/admin/customers/:id` | Partial update |
| `DELETE` | `/api/admin/customers/:id` | Soft delete |

### Medicine timeline entries

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/admin/customers/:id/medicine-entries` | List |
| `POST` | `/api/admin/customers/:id/medicine-entries` | Add entry (Manual / OTC / Rx) |
| `PATCH` | `/api/admin/customers/:id/medicine-entries/:entryId` | Edit qty/dosage/notes/date/type |
| `DELETE` | `/api/admin/customers/:id/medicine-entries/:entryId` | Remove |

PATCH/DELETE are **scope-guarded**: the entry must belong to `:id` or you get 404.

### Catalog

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/admin/medicines?q=...` | Brand/generic prefix search for autocomplete |

### Prescriptions, orders, reminders

Similar shape — see route files under `src/app/api/admin/`.

---

## 🗄 Data model

9 Prisma models (`prisma/schema.prisma`):

| Model | Role |
|---|---|
| `User` | Pharmacy staff (`ADMIN` / `PHARMACIST`) |
| `Customer` | Walk-in / call-in / online customer |
| `Medicine` | Catalog item (brand, name, dosage, pack, rxRequired, ...) |
| `Prescription` | Uploaded Rx — linked to customer + doctor metadata |
| `PrescriptionMedicine` | Join: medicines listed on a prescription |
| `MedicineEntry` | **Direct** timeline entry (no Rx upload needed) |
| `Order` | Storefront order |
| `OrderItem` | Line item on an order |
| `RefillReminder` | Pending refill due for a customer + medicine |

`MedicineEntry.entryType` is an enum: `PRESCRIPTION` · `MANUAL` · `OTC`. Used for badge colors and filtering in the timeline view.

---

## 🌱 Seed data

`prisma/seed.ts` runs at `npm run prisma:seed` and:

1. Creates an admin user from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` env vars
2. Imports **516 medicines** from `docs/medicines_500.csv` (brand, generic name, dosage form, pack, MRP, prescription-required flag)

The catalog seed is idempotent — re-running `prisma db seed` won't duplicate rows.

> The repo also includes `docs/medicines_images.zip` — bulk product images extracted to `public/medicines/` by `scripts/download_medicine_images.py`.

---

## 📂 Project tree (top level)

```
ambica-medical/
├── docs/                       ← Reference: print PDF, source CSV, images ZIP
│   ├── Ambica-Medical-Print.pdf
│   ├── medicines_500.csv
│   └── medicines_images.zip
├── prisma/                     ← Schema + migrations + seed
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── public/                     ← Static assets (favicon, /medicines/*)
├── scripts/                    ← Utility python scripts (image downloader, importer)
├── src/
│   ├── app/                    ← Routes (App Router)
│   ├── components/
│   ├── data/
│   ├── features/admin/schemas.ts
│   ├── lib/
│   ├── middleware.ts
│   └── store/
├── .env.example
├── .gitignore
├── README.md                   ← (this file)
├── next.config.mjs
├── package.json
├── postcss.config.mjs
├── tailwind.config.ts
└── tsconfig.json
```

---

## 🔒 Notes for going to production

The current setup is dev-only. Before deploying:

1. **Replace `AUTH_SECRET`** with a fresh 48-byte random value, stored as a runtime secret.
2. **Change the default admin password** (`SEED_ADMIN_PASSWORD` is named `ChangeMeBeforeDeploy!` deliberately).
3. **Move prescription storage off the local filesystem** — S3 / R2 / GCS. The current `.private/prescriptions/` path only works on a single-instance host.
4. **Add HTTPS + `Secure` cookie flag** — `lib/auth.ts` should set `secure: true` in production.
5. **Pin database `DATABASE_URL`** behind environment-specific secrets, not a committed `.env`.
6. **Add rate limiting** on `/api/admin/auth/login` (currently unlimited).
7. **Run `prisma migrate deploy`** (not `migrate dev`) in CI/CD.

---

## 📄 License

Private project. All rights reserved. Reach out for licensing inquiries.

---

<div align="center">

Built with care for a real pharmacy in Aurangabad.

</div>
