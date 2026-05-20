# API Reference

Every HTTP endpoint, its auth requirement, and its shape. The API is split into
two surfaces:

- **Storefront** — public, read-mostly, no auth.
- **Admin** — every route gated by the edge middleware *and* a handler-level
  `requireRole('PHARMACIST')` re-check.

Conventions:

- All admin routes require the `ambica_admin_sess` HTTP-only cookie (set at login).
- State-changing requests must be **same-origin** (CSRF enforcement).
- Request/response bodies are JSON unless noted (uploads are `multipart/form-data`).
- Validation errors return `422` with `{ error, fieldErrors }`.
- Auth failures return `401` (no/invalid session) or `403` (wrong role / cross-origin).

---

## Authentication

| Method | Path | Auth | Body | Returns |
|---|---|---|---|---|
| `POST` | `/api/admin/auth/login` | none | `{ email, password }` | `200` + `Set-Cookie`; `401` invalid; `423` locked |
| `POST` | `/api/admin/auth/logout` | session | — | `200`, clears cookie |

Login is rate-limited and tracks consecutive failures; after a threshold the
account is locked for a cool-down window. Both outcomes append to `AuditLog`.

---

## Storefront

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/placeholder/medicine` | none | Deterministic SVG pack-shot from query params (`b,n,m,d,f,c,r,cid,s`); `Cache-Control: immutable` |
| `GET` | `/api/medicines/[id]/image` | none | Resolves a medicine to its real image or a placeholder (302) |
| `GET` | `/api/medicines/file/[key]` | none | Serves a locally-stored optimized image (dev backend) |

The catalog itself (516 SKUs) is static JSON bundled into the client — no runtime
endpoint, no DB hit.

---

## Admin — Customers

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/admin/customers` | List/search customers (phone + name prefix) |
| `POST` | `/api/admin/customers` | Create customer **+ optional initial medicines** (one transaction) |
| `GET` | `/api/admin/customers/[id]` | Customer profile + timeline |
| `PATCH` | `/api/admin/customers/[id]` | Update customer fields |
| `DELETE` | `/api/admin/customers/[id]` | Soft-delete (sets `deletedAt`) |
| `POST` | `/api/admin/customers/[id]/medicine-entries` | Add a dispense record |
| `PATCH` | `/api/admin/customers/[id]/medicine-entries/[entryId]` | Edit a record — **404 if it isn't this customer's** (scope guard) |
| `DELETE` | `/api/admin/customers/[id]/medicine-entries/[entryId]` | Remove a record (scope-guarded) |

**Create customer payload:**

```jsonc
{
  "name": "Rohini Deshmukh",
  "phone": "9876543210",          // 10-digit Indian mobile, unique
  "email": "optional@example.com",
  "address": "…",
  "medicines": [                   // optional, written in the same transaction
    { "medicineId": "MED-0042", "quantity": 1, "dosage": "1-0-1, 5 days", "entryType": "OTC" }
  ]
}
```

---

## Admin — Prescriptions

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/admin/prescriptions` | session | List (filter by `customerId`, `status`; cursor pagination) |
| `POST` | `/api/admin/prescriptions` | session | Upload Rx — `multipart/form-data` (`file` + `meta` JSON) |
| `GET` | `/api/admin/prescriptions/[id]/file` | session | Stream the file bytes (audited as `PRESCRIPTION_FILE_DOWNLOAD`) |

**Upload pipeline (POST):** size cap → magic-byte sniff (browser MIME ignored) →
Zod meta validation → bytes stored in `Prescription.fileBytes` (Postgres BYTEA) →
`AuditLog` append → `storageKey` stripped from the response.

Accepted: JPG/JPEG, PNG, WebP, PDF, ≤5 MB. The sniff identifies the real format —
a WebP saved with a `.jpg` extension is accepted and stored as `image/webp`.

---

## Admin — Medicine images

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/admin/medicine-images` | List medicines with image state (filter: `all`, `verified`, `uploaded_unverified`, `no_upload`) |
| `POST` | `/api/admin/medicines/[id]/image` | Upload a pack-shot → validate → WebP → pHash → store |
| `DELETE` | `/api/admin/medicines/[id]/image` | Remove image → revert to placeholder |
| `PATCH` | `/api/admin/medicines/[id]/image` | Re-score: `{ confidence, source, sourceUrl, verified }` |
| `POST` | `/api/admin/medicines/[id]/image/approve` | Approve → surfaces on storefront |
| `POST` | `/api/admin/medicines/[id]/image/reject` | Reject → `{ reason }`, clears public URL |

Upload returns non-blocking warnings (e.g. a perceptual-hash collision with
another SKU) so the pharmacist can decide — same pack legitimately covers
multiple strengths.

---

## Admin — Orders, Reminders, Medicines

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/admin/orders` | List storefront orders |
| `GET` | `/api/admin/reminders` | Pending refill reminders |
| `GET` | `/api/admin/medicines` | Catalog search (admin autocomplete) |

---

## Error envelope

```jsonc
// 4xx validation
{ "error": "Validation failed", "fieldErrors": { "phone": ["Enter a 10-digit Indian mobile number"] } }

// 5xx — safe envelope, no internals leaked
{ "error": "Server error. Reference this request ID when reporting.", "requestId": "…" }
```

The `requestId` maps to a server log line for diagnosis without exposing stack traces.

---

## Audit actions

Every sensitive action appends an immutable `AuditLog` row. Action types include:
`LOGIN_SUCCESS`, `LOGIN_FAILURE`, `LOGIN_LOCKED`, `LOGOUT`, `CUSTOMER_CREATE/UPDATE/DELETE/VIEW`,
`PRESCRIPTION_CREATE/VIEW/FILE_DOWNLOAD`, `MEDICINE_ENTRY_CREATE/UPDATE/DELETE`,
`MEDICINE_IMAGE_UPLOAD/DELETE/VERIFY/APPROVE/REJECT`, `ORDER_CREATE/UPDATE`,
`CSRF_REJECTED`, `RATE_LIMIT_HIT`, `AUTH_DENIED`.
