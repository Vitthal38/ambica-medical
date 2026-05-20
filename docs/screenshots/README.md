# Screenshots

Real screenshots of the live app, captured headless with Playwright — no
mockups, no placeholders. The [README product tour](../../README.md#-product-tour)
renders them.

```
docs/screenshots/
├── desktop/                    1440×900 viewport (2× DPR) → capped to 1600px wide
│   ├── storefront-home.png     /          (featured hero)
│   ├── medicine-catalog.png    /products  (search + filters)
│   ├── product-details.png     /products/p001
│   └── prescription-upload.png /prescription
├── mobile/                     390×844 viewport (3× DPR) → capped to 480px wide
│   ├── mobile-home.png
│   └── mobile-catalog.png
└── admin/                      1440×900 viewport (2× DPR)
    ├── auth-login.png          /admin/login
    ├── admin-dashboard.png     (authenticated)
    ├── admin-customers.png     (authenticated)
    └── admin-medicine-images.png (authenticated)
```

## Design rules (what makes the grid look premium)

- **Viewport shots only** (`fullPage: false`). Full-page captures produce
  7000px-tall slivers that render as broken-looking threads on GitHub.
- **Uniform aspect ratios** — every desktop shot is 16:10, every mobile shot a
  consistent phone frame. Consistency is the whole trick.
- **Baked-in rounded corners** (transparent → clean on GitHub light *and* dark
  mode, since GitHub strips CSS so corners can't be done in markup).
- **Optimized** — resized + PNG-recompressed with `sharp` (69 KB–960 KB each).

## Regenerate

```bash
# Public pages only
node scripts/capture-screenshots.mjs

# Include authenticated admin pages
SHOT_ADMIN_EMAIL="admin@ambicamedical.in" \
SHOT_ADMIN_PASSWORD="…" \
node scripts/capture-screenshots.mjs

# Capture against a local dev server instead of production
SHOT_BASE_URL="http://localhost:3000" node scripts/capture-screenshots.mjs
```

The script wipes + regenerates `desktop/`, `mobile/`, and `admin/` on each run.
After capture, run the optimize + round-corners pass (see the project's image
tooling) before committing — raw captures are larger and square-cornered.

## Conventions

- **Filenames:** lowercase, hyphenated, stable (the README references them directly).
- **Privacy:** admin/customer shots must use **test data only** — never commit a
  real patient's name, phone, or prescription.
- **Size budget:** keep each PNG under ~1.5 MB; the optimizer enforces width caps.
