# Screenshots

The main [README](../../README.md#-screenshots) references the images below.
Drop a PNG with the exact filename and it renders automatically — no README edit
needed.

> These slots are intentionally empty in the repo (no fabricated imagery). Capture
> them from the live app or a local dev run, then commit the PNGs here.

## Required files

| Filename | Page to capture | Notes |
|---|---|---|
| `storefront-home.png` | `/` | Full landing — hero, categories, featured |
| `catalog.png` | `/products` | Show search box + category chips active |
| `product-detail.png` | `/products/p001` | Crocin — shows real photo + Rx/OTC badge |
| `admin-dashboard.png` | `/admin` | After login — recent activity |
| `admin-customer.png` | `/admin/customers/[id]` | Customer profile with medicine timeline |
| `prescription-upload.png` | `/prescription` | The 4-step wizard, step 1 |

### Optional (nice to have)

| Filename | Page |
|---|---|
| `mobile-home.png` | `/` at 390px width (mobile) |
| `admin-medicine-images.png` | `/admin/medicine-images` |
| `checkout.png` | `/checkout` |
| `login.png` | `/admin/login` |

## How to capture clean, consistent shots

1. **Viewport:** 1440×900 for desktop, 390×844 for mobile (Chrome DevTools device toolbar).
2. **Zoom:** 100%. Hide browser chrome where possible (DevTools → ⋯ → "Capture full size screenshot" for full-page).
3. **State:** load real data — sign in for admin shots; clear any error toasts.
4. **Format:** PNG, ≤ 1600px wide (keeps the repo light; GitHub scales them).
5. **Privacy:** for admin/customer shots, use **test data only** — never commit a real patient's name, phone, or prescription. Redact if needed.
6. **Filename:** match the table exactly (lowercase, hyphenated).

### One-liner full-page capture (Chrome DevTools)

```
Cmd/Ctrl + Shift + P  →  "Capture full size screenshot"
```

### Optional: scripted capture with Playwright

If you want reproducible shots, add Playwright as a dev dependency and script the
six pages. (Not committed by default to keep deps lean — see CONTRIBUTING.md.)

```ts
// scripts/screenshots.ts (example — not included)
import { chromium } from 'playwright';
const shots = [
  ['/', 'storefront-home.png'],
  ['/products', 'catalog.png'],
  ['/products/p001', 'product-detail.png'],
];
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
for (const [path, file] of shots) {
  await p.goto('https://ambica-medical.vercel.app' + path, { waitUntil: 'networkidle' });
  await p.screenshot({ path: `docs/screenshots/${file}`, fullPage: true });
}
await b.close();
```
