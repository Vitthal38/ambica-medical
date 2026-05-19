# Medicine image system — production architecture

This document is the design spec for everything in the catalog-image pipeline:
schema, ingestion, validation, admin tooling, outreach automation, photography
support, and frontend rendering.

It complements `docs/IMAGES.md`, which is the day-to-day operations guide.

---

## Honest constraints

These shape every design decision below. They are not optional.

1. **No scraping copyrighted sources.** Photos on Tata 1mg, PharmEasy, Netmeds,
   Apollo, and (without permission) the manufacturers' own product pages are
   copyrighted. Scraping them creates infringement liability for a licensed
   pharmacy. Patient-safety regulations make "best-guess" images worse than
   placeholders: a pack mismatch can cause a patient to refuse delivery or
   misidentify their dose. The system is designed to make REAL photos easy
   to acquire from legitimate sources, not to fake them.
2. **OCR is run by the operator, not by Vercel.** Tesseract is a native
   binary that cannot run inside Vercel functions. OCR happens locally
   before `npm run images:import`, emitting a JSON sidecar that the import
   reads. This is a feature, not a bug: it lets the operator iterate on
   bad scans before committing them to the catalog.
3. **Approval is human.** The pipeline auto-rejects malformed, oversized,
   or out-of-bounds files. Anything else lands in PENDING and a pharmacist
   approves or rejects. Bypassing review is supported (`--confidence=100`
   on bulk-import) but is opt-in and audited.
4. **Storage is durable.** Vercel ephemeral disk is rejected at runtime by
   the production-safety guard. Production uses Vercel Blob; local dev
   uses `.local-uploads/medicines/`. No middle ground.

---

## Source-of-truth table: which legal sources we accept

| Source code | Source                                            | Auto-approve OK? | Notes |
|-------------|---------------------------------------------------|------------------|-------|
| `own_photo`         | Pharmacy's own photography of in-stock packs | Yes, with OCR ≥ 0.85 confidence | Cheapest + most accurate path. Patient sees the pack they'll receive. |
| `manufacturer`      | Manufacturer marketing team, with written grant | Yes              | Email permission stored alongside; `copyrightStatus = MANUFACTURER_AUTHORIZED`. |
| `distributor`       | Authorized distributor catalog feed             | Yes              | Stored against the distributor contract reference (`imageSourceUrl`). |
| `stock_licensed`    | Stock photo licence (Shutterstock, Adobe Stock) | Yes              | Licence ID recorded in `imageSourceUrl`. |
| `admin_upload`      | Manual admin upload of unknown provenance       | No — PENDING     | Forces human approval before going live. |

Anything not in this list is rejected at upload.

---

## Phase 1 — Media database design (SHIPPED)

Image metadata lives on the `Medicine` table — denormalized for fast
read-path on the storefront. A separate `MedicineImageRevision` table
keeps an append-only history when we replace an image.

### Current columns on `Medicine`

| Column              | Type        | Why |
|---------------------|-------------|-----|
| `imageStorageKey`   | String?     | Internal key (e.g. `med/MED-0001/a1b2c3d4.webp`). Content-addressable. |
| `imagePublicUrl`    | String?     | Denormalized fast-path: storefront reads this directly, no JOIN. |
| `imageMime`         | String?     | Always `image/webp` post-optimization. |
| `imageWidth`        | Int?        | Set by sharp. Used for `srcset`. |
| `imageHeight`       | Int?        | Set by sharp. |
| `imageBytes`        | Int?        | Post-optimization byte size. |
| `imagePhash`        | String?     | 16-hex 64-bit perceptual hash for dupe detection. |
| `imageSha256`       | String?     | Exact-byte dedup. |
| `imageSource`       | String?     | One of the source codes above. |
| `imageSourceUrl`    | String?     | Provenance URL or licence reference. |
| `imageConfidence`   | Int?        | 0–100 composite confidence (see Phase 3). |
| `imageVerifiedAt`   | DateTime?   | When a pharmacist last verified. |
| `imageOptimizedAt`  | DateTime?   | Last sharp run — used to detect images needing re-optimization. |

### Added this round

| Column              | Type        | Why |
|---------------------|-------------|-----|
| `approvalStatus`    | enum (`PENDING`, `APPROVED`, `REJECTED`, `NEEDS_REVIEW`) | Drives the admin queue. Default `PENDING` for `admin_upload`, `APPROVED` for trusted sources unless OCR confidence is low. |
| `copyrightStatus`   | enum (`UNKNOWN`, `OWNED_BY_PHARMACY`, `MANUFACTURER_AUTHORIZED`, `DISTRIBUTOR_CONTRACT`, `STOCK_LICENSED`) | Records the *basis* under which we hold the image — independent of `imageSource`. |
| `ocrExtractedText`  | Text?       | Raw OCR output, capped at 2 KB. Useful for grep + diagnosing rejections. |
| `ocrMatchedAt`      | DateTime?   | When OCR last ran. Re-OCR on source-image change. |
| `photographerId`    | String?     | User id when source = `own_photo` — audit who shot it. |
| `rejectionReason`   | String?     | Free text when `approvalStatus = REJECTED`. |

### Duplicate detection strategy

Three layers:

1. **Exact bytes**: `imageSha256` UNIQUE-checked per medicine before insert.
   A second upload of identical bytes for the same SKU is a no-op.
2. **Perceptual hash**: `imagePhash` Hamming-distance ≤ 5 against the
   catalog. Surfaced as a non-blocking warning ("3 other SKUs share this
   pack-shot — verify this is the right strength").
3. **OCR-driven**: when OCR-extracted brand text matches the brand of a
   different medicine, the upload moves to `NEEDS_REVIEW`.

We don't auto-block dupes — same pack legitimately covers multiple
strengths in pharma (Crocin 250 / 500 / 650 share carton design), and
manufacturer batch updates produce near-duplicates that ARE the right photo.

---

## Phase 2 — Import pipeline (SHIPPED, extended this round)

CLI: `npm run images:import -- <dir> [--source=...] [--confidence=N] [--force] [--dry-run]`

Per-file flow:

```
{id}.{ext} on disk
   │
   ├── identifierFromFilename(file) → id or slug
   ├── load any `{id}.ocr.json` sidecar (NEW this round)
   │
   ├── processMedicineImage()
   │     ├── byte-size cap (8 MB)
   │     ├── reject SVG / GIF / PDF / ZIP magic bytes
   │     ├── allow-list PNG / JPEG / WebP / AVIF magic bytes
   │     ├── sharp metadata (dim 200..6000)
   │     ├── sharp → WebP @ 82, fit-inside 1024×1024, EXIF stripped
   │     ├── SHA-256 of optimized bytes → storage key suffix
   │     ├── 64-bit perceptual hash
   │     └── put() to storage adapter
   │
   ├── duplicate check: phash + sha256 across catalog
   ├── composite confidence (see Phase 3) using OCR sidecar if present
   ├── decide approvalStatus from confidence + source
   └── atomic Medicine UPDATE + audit row
```

`--source=manufacturer|distributor|own_photo|stock_licensed|admin_upload`
drives both `imageSource` and the initial `approvalStatus`.

---

## Phase 3 — Validation engine (NEW this round, partial)

OCR runs in a separate Python script because Tesseract is a native binary
that does not exist on Vercel functions. **This is the right architecture**
— moving OCR out of the request path keeps page rendering fast and lets
the operator iterate on tricky scans without re-uploading.

### Operator workflow

```bash
# Step 1 — Pre-flight OCR (offline, on the operator's laptop)
python scripts/ocr-validate.py ./incoming

# Step 2 — Bulk import with sidecar data
npm run images:import -- ./incoming --source=own_photo
```

OCR produces a `{id}.ocr.json` sidecar next to each image:

```json
{
  "extracted_text": "CROCIN\n500 mg\nParacetamol Tablets IP\nManufactured by GSK Consumer Healthcare",
  "ocr_engine": "tesseract 5.3.3",
  "ocr_language": "eng",
  "matched_medicine_id": "MED-0042",
  "scores": {
    "brand_exact": 1.0,
    "brand_fuzzy": 1.0,
    "strength_match": 1.0,
    "manufacturer_match": 0.95,
    "form_match": 1.0,
    "image_quality": 0.88
  },
  "composite_confidence": 0.97,
  "recommended_action": "auto_approve"
}
```

### Composite confidence formula

```
confidence = 0.30 * brand_exact_or_fuzzy
           + 0.20 * strength_match
           + 0.20 * manufacturer_match
           + 0.10 * dosage_form_match
           + 0.20 * image_quality

auto_approve:  confidence >= 0.85
needs_review:  0.50 <= confidence < 0.85
auto_reject:   confidence < 0.50
```

Image quality combines: pixel resolution (relative to 1024px target),
sharpness (Laplacian variance), absence of heavy compression artefacts.

### Honest accuracy caveat

OCR on Indian pharma packs lands around **60–75% per-character accuracy**.
Brand text uses stylized fonts that Tesseract handles poorly. Strength
(`500 mg`, `10 ml`) and Latin-script generic names (`Paracetamol`,
`Aceclofenac`) are far more reliable than brand names. The confidence
scorer reflects this: strength + generic name + manufacturer carry more
weight than the brand string itself, which often arrives as garbage.

---

## Phase 4 — Admin panel (SHIPPED earlier, extended this round)

Route: `/admin/medicine-images`. Existing UI: filter by `with image / no image`,
search by name, upload / verify / delete per SKU.

Added this round:

- Filter by `approvalStatus` (`PENDING`, `NEEDS_REVIEW`, `APPROVED`, `REJECTED`).
- API: `POST /api/admin/medicines/{id}/image/approve`
- API: `POST /api/admin/medicines/{id}/image/reject` (body: `{reason}`)
- Visual queue badge on the side nav: pending count.

### Deferred (with effort estimates)

- **Side-by-side compare** (new image vs current vs placeholder): ~3 hours.
  Useful when replacing an already-approved image.
- **Batch approve / reject**: ~2 hours. Critical once outreach replies
  start arriving in batches of 30–60 photos.
- **Mobile preview iframe**: ~1 hour. Renders the actual `/products/{id}`
  card in a 320px viewport for sanity check before approval.
- **Audit history visualization**: ~4 hours. The audit rows are already
  written; a simple timeline view per SKU is the missing piece.

---

## Phase 5 — Manufacturer outreach (NEW this round)

`npm run images:outreach` walks the catalog, groups SKUs by manufacturer,
generates one `.eml` per manufacturer with:

- Pre-filled From / To / Subject / Body
- Per-manufacturer SKU CSV attached (id, brand, dose, pack, category)
- Polite request for authorized retailer pack-shots + image-use permission

Output:

```
outreach/
  cipla/
    cipla.eml
    cipla-skus.csv
  sun-pharma/
    sun-pharma.eml
    sun-pharma-skus.csv
  ...
  _index.csv     ← summary of every manufacturer + recipient slot
```

Operator drags the `.eml` files into their mail client (Outlook, Apple
Mail, Thunderbird) → reviews each → clicks send. Replies arrive over
2–6 weeks. Photos go into `incoming/{mfr-slug}/`, then through the
standard `npm run images:import -- ./incoming/cipla --source=manufacturer`
pipeline.

The script **does not send mail itself.** Sending bulk B2B email from an
unverified domain risks SPF/DKIM rejection and reputational damage. The
operator's personal/business email account is the right transport — let
their domain reputation carry the message.

### Address discovery

The script does NOT discover recipient email addresses (no public, accurate
B2B database for Indian pharma marketing contacts that we can use). The
`To:` field is left as a placeholder for the operator to fill from the
manufacturer's website contact page or LinkedIn. Spam-blasting random
inboxes hurts reply rate.

---

## Phase 6 — Photography assistant (NEW this round)

`python scripts/build-photography-checklist.py` produces a printable
PDF:

- **Cover** — date, count, store info
- **Shooting guide** — equipment, white-balance, framing, naming
  convention (`{medicineId}.jpg`)
- **Checklist tables** — one row per SKU, ordered by priority:
  1. Rx items in `infection-care` (top-prescribed)
  2. Rx items in `heart-and-bp` + `diabetes-care` (chronic)
  3. Top categories by SKU count
  4. Everything else
- **Tick column** for paper sign-off
- **Page footer** — workflow reminder: shoot → `incoming/` → OCR →
  `npm run images:import`

Operator prints, walks the store, photographs in order. 2–3 minutes per
SKU × 200 priority SKUs = one long day to cover the most-visible cards.

---

## Phase 7 — Frontend integration (SHIPPED)

### Image fallback priority — codified

```
ProductImage src resolution order:
  1. product.imagePublicUrl       ← approved real image (Vercel Blob CDN)
  2. product.imageUrl             ← legacy catalog field (rarely used now)
  3. /api/placeholder/medicine    ← deterministic SVG, query-string driven
```

On `<img onerror>`, falls back from step 1 → step 3 in one hop (skipping 2
because legacy URLs that 404 won't recover). The SVG endpoint never 404s
because the input IS the identity.

### Performance

- Native `loading="lazy"` + `decoding="async"` on every card.
- `sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"` so
  the browser picks the right `srcset` for the viewport.
- `aspect-square` enforced on card containers — no CLS, no layout shift
  when images load.
- SVG placeholders: `Cache-Control: public, max-age=31536000, immutable`.
- Real images via Vercel Blob: same aggressive cache (key includes hash,
  re-uploads get a new URL, no invalidation needed).

---

## Folder structure

```
src/
├── lib/
│   └── medicine-images/
│       ├── pipeline.ts        # validate → optimize → hash → store (Phase 2)
│       ├── storage.ts         # Vercel Blob | local-FS adapter (Phase 2)
│       ├── placeholder.ts     # deterministic SVG generator (Phase 7)
│       ├── silhouettes.ts     # dosage-form silhouettes (Phase 7)
│       ├── client.ts          # placeholderUrl(product) helper (Phase 7)
│       └── confidence.ts      # NEW — composite scoring from OCR sidecar (Phase 3)
├── app/
│   ├── api/
│   │   ├── medicines/[id]/image/route.ts          # public image resolver (Phase 7)
│   │   ├── medicines/file/[key]/route.ts          # local-FS serve adapter (Phase 2)
│   │   ├── placeholder/medicine/route.ts          # SVG endpoint (Phase 7)
│   │   └── admin/
│   │       ├── medicine-images/route.ts                       # admin list (Phase 4)
│   │       └── medicines/[id]/image/
│   │           ├── route.ts                                    # POST/DELETE/PATCH (Phase 4)
│   │           ├── approve/route.ts   # NEW (Phase 4)
│   │           └── reject/route.ts    # NEW (Phase 4)
│   └── (admin)/admin/medicine-images/page.tsx     # admin queue UI (Phase 4)
scripts/
├── enrich-with-pubchem.ts             # Phase 7 — molecule watermarks
├── bulk-import-images.ts              # Phase 2 — CLI ingester
├── generate-outreach-emails.ts        # NEW — Phase 5
├── ocr-validate.py                    # NEW — Phase 3 OCR pre-flight
├── build-photography-checklist.py     # NEW — Phase 6 printable PDF
└── build_catalog_pdf.py               # full catalog PDF (delivered earlier)
docs/
├── IMAGES.md                  # day-to-day ops guide
└── IMAGES-ARCHITECTURE.md     # this file
prisma/
└── migrations/
    └── 2026XXXX_add_image_approval_columns/
        └── migration.sql      # NEW this round
public/
└── molecules/                 # PubChem CC0 molecule PNGs (1.3 MB, committed)
outreach/                      # OUTPUT of `npm run images:outreach` (gitignored)
incoming/                      # operator drop-zone for new photos (gitignored)
```

---

## Rollout plan

### Week 1 — Foundations (DONE)

- ✓ Image pipeline shipped
- ✓ Admin upload UI shipped
- ✓ SVG placeholders shipped (every card consistent)
- ✓ Catalog stripped of irrelevant photos

### Week 2 — Acquisition machinery (THIS ROUND)

- Manufacturer outreach generated; operator sends 80 emails
- Photography checklist printed
- OCR pre-flight script available locally
- Schema updated for approval workflow

### Week 3-4 — First replies + own photos

- Operator photographs the top-100 priority SKUs (Rx infection-care +
  chronic) over ~2 days
- First manufacturer replies arrive (typically 30-40% reply rate)
- Bulk-import runs nightly; approval queue clears within hours

### Month 2-3 — Coverage to ~70%

- Continuing photography + manufacturer trickle gets brand coverage to
  ~70% of SKUs (~360 of 516)
- The remaining ~30% stay on SVG placeholders — by design, these are
  niche products where a placeholder is appropriate

### Month 4+ — Maintenance

- Nightly cron checks for missing CDN bytes (404 → flag for re-import)
- Re-OCR any photo whose source file changes
- Re-optimization sweep when sharp version bumps

---

## Deployment strategy

- Code: git push → Vercel deploys main (existing webhook)
- DB migrations: `npm run deploy:db` from operator's laptop with prod
  `DATABASE_URL` (unchanged from earlier sessions)
- Storage: Vercel Blob (single env var `BLOB_READ_WRITE_TOKEN`)
- OCR tooling: `pip install pytesseract` + system Tesseract on the
  operator's machine — NOT on Vercel

### Operator's machine setup (one-time)

```bash
# Windows (with chocolatey or scoop)
choco install tesseract
pip install pytesseract pillow

# macOS
brew install tesseract
pip install pytesseract pillow

# Linux
sudo apt install tesseract-ocr libtesseract-dev
pip install pytesseract pillow
```

---

## Future scaling notes

When the catalog grows past ~5,000 SKUs, expected pressure points and
mitigations:

| Pressure | Mitigation |
|---|---|
| Admin queue overflow | Add per-pharmacist auto-assign + SLA badges. Add batch approve. |
| OCR throughput | Move OCR to a tiny VPS or GitHub Actions cron, processing `incoming/` on schedule. |
| Image storage cost | Vercel Blob free tier (5 GB / 100 GB egress) covers ~6,000 packshots. Above that, migrate to Cloudflare R2 (free egress) — storage adapter already abstracted. |
| Search across OCR text | Add Postgres `tsvector` GIN index on `ocrExtractedText` for fast "find all packs that mention ‘paracetamol'" type queries. |
| Duplicate detection at scale | Move phash matching from `findMany` scan to a dedicated index — `pg_trgm` doesn't help (binary), use a separate sorted-CIDs cache or migrate phash store to Postgres `bit(64)` with bit-distance UDF. |
| Multi-pharmacy expansion | Multi-tenant the image storage key prefix from `med/{id}/` to `tenant/{tid}/med/{id}/`. Per-tenant outreach + photography lists. |

---

## What this system is NOT

- It is not a way to "automatically populate every card with a real photo
  on day one." That requires either licensed sources or your camera.
  The system makes the LEGAL paths fast; it does not invent illegal ones.
- It is not OCR-on-Vercel. Tesseract runs on the operator's machine.
- It is not a CMS for arbitrary media. Every byte is a medicine pack-shot
  validated against a known SKU.
- It is not a CDN. We delegate caching + delivery to Vercel Blob + the
  edge cache layer. The DB stores metadata, not bytes.
