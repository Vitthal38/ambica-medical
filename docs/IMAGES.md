# Medicine images — operations guide

This pharmacy's catalog has 516 SKUs. Every product card needs an image, but
scraping competitor pharmacies (1mg / PharmEasy / Netmeds / Apollo) is not an
option — see [SECURITY.md](../SECURITY.md) for the legal rationale. This doc
covers what we DO use.

## The three layers, in order

For every medicine, the card resolves its image like this:

```
  ┌────────────────────────────────────────────────────────────────────┐
  │ 1. Real photo uploaded for this SKU?                               │
  │       Yes → serve from Vercel Blob (or local FS in dev)            │
  │       No  → fall through                                           │
  ├────────────────────────────────────────────────────────────────────┤
  │ 2. Generate the SVG placeholder                                    │
  │       White card, brand text, dosage badge, Rx/OTC badge,          │
  │       dosage-form silhouette (tablet/capsule/syrup/dropper/...),   │
  │       molecule structure watermark (when PubChem CID known)        │
  └────────────────────────────────────────────────────────────────────┘
```

Layer 1 is the upload pipeline (admin UI + bulk import). Layer 2 is the
deterministic SVG generator. Both are described below.

---

## Layer 1: getting real photos in

Three legal ways to source pack photos, fastest first:

### Option A — Photograph your own inventory

You're a real pharmacy with the stock on hand. Phone + a piece of A4 paper as
background + decent natural light = a usable pack-shot in ~2 minutes per SKU.
2-3 hours of work covers a couple of hundred fast-movers.

### Option B — Ask the manufacturer

Most Indian pharma marketing teams will send authorized retailer pack-shots
on request — they want their products shown well. 80-ish unique manufacturers
in our catalog, so 80 emails.

### Option C — Stock photo licence

Shutterstock / Adobe Stock have generic-medicine packs. Cheap but not always
brand-accurate.

### Importing the photos you've got

Once you have a folder of files named after medicine IDs or slugs:

```
incoming/
  MED-0001.jpg
  MED-0002.png
  paracetamol-500mg.webp
  MED-0042--front.jpg     # double-dash strips the suffix
```

```sh
npm run images:import -- incoming/ \
  --source=own_photo \
  --confidence=100
```

This:
- matches each file to a medicine row by `id` or `slug`,
- pushes the bytes through the SAME pipeline the admin UI uses (sharp,
  WebP, perceptual hash, validation),
- uploads to Vercel Blob (production) or local FS (dev),
- updates the DB atomically,
- prints a per-file report at the end.

Flags:
- `--source=admin_upload|manufacturer|own_photo|stock_licensed`
- `--confidence=N` (0–100; ≥70 auto-marks `imageVerifiedAt`)
- `--force` re-imports even if the SKU already has an image
- `--dry-run` validates everything without writing to DB / storage

### Prerequisites for production uploads

Local FS storage is BLOCKED in production by design (see `src/lib/medicine-images/storage.ts`).
On Vercel you must:

1. Project → Storage → **Create → Blob**.
2. Copy the `BLOB_READ_WRITE_TOKEN` it gives you.
3. Add it as an env var (Production + Preview + Development).
4. Redeploy.

The storage adapter auto-detects the token and switches backends.

---

## Layer 2: the SVG placeholder

For everything that doesn't have a real photo yet, we render an SVG
deterministically from the catalog fields you already have:

- **Brand** (large heading)
- **Generic name** (subtitle)
- **Dosage** (category-coloured pill badge)
- **Manufacturer** ("by …" footer)
- **Rx / OTC** corner badge
- **Category-coloured stripe** along the top
- **Dosage-form silhouette** — tablet, capsule, syrup bottle, dropper, tube,
  vial, inhaler, sachet, or generic carton, picked from `dosageForm`
- **Molecule structure watermark** when we know the PubChem CID for the
  active ingredient

### PubChem enrichment

`scripts/enrich-with-pubchem.ts` walks the catalog, parses the INN out of
each `name` field (e.g. `"Paracetamol 500mg"` → `Paracetamol`), looks up the
PubChem CID, downloads the 2-D molecule PNG to `public/molecules/{cid}.png`,
and writes the CID back into `src/data/{products,medicines}.json`.

```sh
npm run images:pubchem            # incremental — skips SKUs with a CID
npm run images:pubchem -- --force # re-fetch everything
```

PubChem is CC0 public domain (US NIH). No licence issue.

Current coverage: **412 of 516 SKUs (80%)** match a CID. The 104 misses are
non-drug items (face masks, glucometers, lotions) and a few combination
products whose first-named molecule isn't in PubChem under that label.

### Endpoint

`GET /api/placeholder/medicine?b=Crocin&n=Paracetamol&d=500mg&f=tablet&cid=1983&c=fever-and-pain-relief&r=0`

Query keys:
- `b` brand (required)
- `n` generic name
- `m` manufacturer
- `d` dosage
- `f` dosage form (drives silhouette)
- `c` category slug (drives stripe colour)
- `r` `1` for Rx, anything else for OTC
- `cid` PubChem CID — embeds the molecule PNG
- `s` size in px (240, 320, 480, 640, 800)

Inputs are length-capped and stripped of control chars. SVG output contains
no `<script>`, no `<foreignObject>`, no external refs except the molecule
`<image href="/molecules/{cid}.png">` which is served from our own origin.
Response headers set strict CSP + nosniff so even a misconfigured client
can't execute embedded content.

ETag = `sha256(input-key)[:16]`. Cache-Control: `public, max-age=31536000,
immutable`. The query string IS the identity — any change produces a new
URL, so we never need to invalidate.

---

## Layer 3: the upload pipeline (internal)

`src/lib/medicine-images/pipeline.ts` is the single point of entry for any
byte that becomes a medicine image. Both the admin UI upload route and the
bulk-import CLI use it. It refuses:

| Reason            | Trigger                                                        |
|-------------------|----------------------------------------------------------------|
| `too_large`       | > 8 MB on the wire                                             |
| `rejected_format` | SVG, GIF, PDF, ZIP magic bytes                                 |
| `unsupported_format` | Anything that isn't PNG / JPEG / WebP / AVIF magic bytes    |
| `corrupt`         | sharp can't decode                                             |
| `too_small`       | < 200×200                                                      |
| `too_large_dimensions` | > 6000×6000                                               |
| `storage_failed`  | Blob / FS write threw                                          |

On success:
- Output is WebP at quality 82, resized to fit 1024×1024.
- EXIF orientation applied then stripped.
- SHA-256 of optimized bytes becomes the storage key suffix (content-
  addressable: re-uploading the same bytes overwrites in place).
- 64-bit perceptual hash computed for duplicate detection (warning, not
  blocking — same pack legitimately covers multiple strengths).
- DB row updated with `imageStorageKey`, `imagePublicUrl`, `imageMime`,
  `imageWidth`, `imageHeight`, `imageBytes`, `imagePhash`, `imageSha256`,
  `imageSource`, `imageConfidence`, `imageVerifiedAt`, `imageOptimizedAt`.
- Audit row written (`MEDICINE_IMAGE_UPLOAD`).

---

## Reverting a SKU to placeholder

Either:

```sh
curl -X DELETE -H "Cookie: ambica_admin_sess=..." \
  https://ambica-medical.vercel.app/api/admin/medicines/MED-0001/image
```

Or from the admin UI (`/admin/medicine-images`), click the SKU's **Delete**
button. The bytes are removed from storage AND the DB columns are cleared,
so the card immediately drops back to the SVG placeholder.
