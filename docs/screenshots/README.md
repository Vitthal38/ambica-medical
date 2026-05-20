# Screenshots

These are **real screenshots of the live app**, captured headless with Playwright —
no mockups, no placeholders. The [README product tour](../../README.md#-product-tour)
renders them.

```
docs/screenshots/
├── desktop/                 1440×900 viewport (2× DPR), capped to 1600px wide
│   ├── storefront-home.png  full landing page (the featured hero)
│   ├── catalog.png          /products — search + filters
│   ├── product-detail.png   /products/p001
│   ├── prescription-upload.png
│   ├── login.png            /admin/login
│   ├── admin-dashboard.png  (authenticated)
│   ├── admin-customers.png  (authenticated)
│   └── admin-medicine-images.png (authenticated)
└── mobile/                  390×844 viewport (3× DPR), capped to 480px wide
    ├── home.png
    └── catalog.png
```

All shots are post-processed: resized for the web, PNG-recompressed with `sharp`,
and given baked-in **rounded corners** (transparent — renders cleanly on GitHub
light *and* dark mode, since GitHub strips CSS so corners can't be done in markup).

## Regenerate

```bash
# 1. Capture (public pages only)
node scripts/capture-screenshots.mjs

# 2. Include admin pages (needs a login)
SHOT_ADMIN_EMAIL="admin@ambicamedical.in" \
SHOT_ADMIN_PASSWORD="…" \
node scripts/capture-screenshots.mjs

# 3. Capture against a local dev server instead of production
SHOT_BASE_URL="http://localhost:3000" node scripts/capture-screenshots.mjs
```

The script (`scripts/capture-screenshots.mjs`) handles desktop + mobile viewports,
logs into the admin panel, and writes straight into the folders above. The
optimize + round-corners post-processing is applied with `sharp`.

## Conventions

- **Filenames:** lowercase, hyphenated, stable (the README references them directly).
- **Desktop:** viewport shots for grid consistency; the landing page is the one
  full-page hero.
- **Privacy:** admin/customer shots must use **test data only** — never commit a
  real patient's name, phone, or prescription.
- **Size budget:** keep each PNG under ~1.5 MB; the optimizer enforces width caps.
