/**
 * Deterministic SVG placeholder generator for medicine cards.
 *
 * Pure function — same inputs always produce the same byte-for-byte output, so
 * we can derive a stable ETag from a SHA-256 of the inputs and cache forever.
 *
 * Output is intentionally compact and inline-styled (no <style> blocks, no
 * external fonts). It renders identically on Vercel's edge, in a browser, and
 * inside an <img> tag. SVG <text> uses system-ui so the placeholder reads well
 * across devices without shipping a webfont.
 *
 * Design priorities, in order:
 *   1. *Looks* like a real medicine pack-shot at thumbnail size — white card,
 *      category-coloured top band, prominent brand, secondary name and dose.
 *   2. Communicates Rx/OTC compliance status — required by the Drugs and
 *      Cosmetics Rules for online listings (visible Rx mark).
 *   3. Quiet enough to coexist with real photos in the same grid (no garish
 *      colours, no clip-art mascots).
 *
 * Strictly NO scraped / copied / trademarked imagery. This is original art
 * generated per-product from the catalog text fields we already store.
 */

export interface PlaceholderInput {
  brand: string;
  name?: string;
  manufacturer?: string;
  dosage?: string;
  category?: string;
  rxRequired?: boolean;
  /** Pixel size of the square SVG. Defaults to 480 — sharp at 2x retina for a 240px card. */
  size?: number;
}

const CATEGORY_BAND: Record<string, string> = {
  'fever-and-pain-relief': '#dc2626', // red
  'cold-cough-and-flu': '#0ea5e9', // sky
  'diabetes-care': '#7c3aed', // violet
  'heart-and-bp': '#e11d48', // rose
  'vitamins-and-supplements': '#f59e0b', // amber
  'skin-care': '#f97316', // orange
  'first-aid-and-personal-care': '#059669', // primary green
  'digestive-care': '#10b981',
  'women-care': '#ec4899',
  'eye-and-ear-care': '#06b6d4',
};

const DEFAULT_BAND = '#059669';

/** XML-safe escape — covers the five characters that matter inside SVG text. */
function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Hard-truncate a string with an ellipsis. We do truncation in JS rather than
 * relying on SVG's `textLength` because Safari miscalculates it on inline text
 * inside `<text>` elements that contain styled `<tspan>`s.
 */
function fit(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1).trimEnd() + '…';
}

/**
 * Build the SVG markup. Pure string — no DOM, no React. Safe to call from
 * route handlers, edge functions, or build scripts.
 */
export function renderMedicinePlaceholder(input: PlaceholderInput): string {
  const size = input.size ?? 480;
  const brand = fit(input.brand || 'Medicine', 22);
  const name = input.name ? fit(input.name, 36) : '';
  const manufacturer = input.manufacturer ? fit(input.manufacturer, 32) : '';
  const dosage = input.dosage ? fit(input.dosage, 16) : '';
  const band = CATEGORY_BAND[input.category ?? ''] ?? DEFAULT_BAND;
  const rxText = input.rxRequired ? 'Rx' : 'OTC';
  const rxColor = input.rxRequired ? '#dc2626' : '#059669';

  // Brand-font size scales down for longer names so the heading never overflows
  // the card. 22 chars max keeps the largest font readable at 240px display.
  const brandSize = brand.length > 16 ? 28 : brand.length > 10 ? 34 : 40;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="${escapeXml(brand)} medicine pack">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#f8fafc"/>
    </linearGradient>
    <linearGradient id="shine" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset=".5" stop-color="#ffffff" stop-opacity=".45"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <!-- Card body -->
  <rect width="${size}" height="${size}" fill="url(#bg)"/>

  <!-- Category-coloured band along the top — mimics medicine carton stripe -->
  <rect x="0" y="0" width="${size}" height="${Math.round(size * 0.045)}" fill="${band}"/>

  <!-- Subtle inner border for the "card" feel -->
  <rect x="1" y="1" width="${size - 2}" height="${size - 2}" fill="none" stroke="#e5e7eb" stroke-width="2"/>

  <!-- Pack silhouette: a rounded rectangle behind the text, hinting at a tablet strip -->
  <g transform="translate(${size * 0.12}, ${size * 0.22})">
    <rect width="${size * 0.76}" height="${size * 0.52}" rx="${size * 0.04}" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
    <!-- Decorative blister dots, evenly spaced -->
    ${(() => {
      const rows = 2;
      const cols = 5;
      const padX = size * 0.08;
      const padY = size * 0.08;
      const innerW = size * 0.76 - padX * 2;
      const innerH = size * 0.52 - padY * 2;
      const r = Math.min(innerW / (cols * 3), innerH / (rows * 3));
      const dots: string[] = [];
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const cx = padX + (innerW / (cols - 1)) * col;
          const cy = innerH * 0.78 + padY + (innerH / 6) * row;
          dots.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="#f1f5f9" stroke="#e2e8f0" stroke-width="1.2"/>`);
        }
      }
      return dots.join('');
    })()}
  </g>

  <!-- Diagonal shine for a slight pack-shot gloss -->
  <rect x="-${size * 0.2}" y="${size * 0.2}" width="${size * 1.4}" height="${size * 0.18}" fill="url(#shine)" transform="rotate(-12 ${size / 2} ${size / 2})" opacity=".5"/>

  <!-- Brand (primary heading) -->
  <text x="${size / 2}" y="${size * 0.38}" text-anchor="middle"
        font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
        font-weight="800" font-size="${brandSize}" fill="#0f172a">${escapeXml(brand)}</text>

  <!-- Name (subtitle) -->
  ${name ? `<text x="${size / 2}" y="${size * 0.46}" text-anchor="middle"
        font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
        font-weight="500" font-size="18" fill="#475569">${escapeXml(name)}</text>` : ''}

  <!-- Dosage pill -->
  ${dosage ? `<g transform="translate(${size / 2}, ${size * 0.55})">
    <rect x="-${dosage.length * 6 + 12}" y="-16" width="${dosage.length * 12 + 24}" height="32" rx="16" fill="${band}" opacity=".1"/>
    <text x="0" y="6" text-anchor="middle"
          font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
          font-weight="700" font-size="16" fill="${band}">${escapeXml(dosage)}</text>
  </g>` : ''}

  <!-- Rx / OTC corner badge -->
  <g transform="translate(${size - 64}, 28)">
    <rect width="44" height="22" rx="11" fill="${rxColor}"/>
    <text x="22" y="15" text-anchor="middle"
          font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
          font-weight="800" font-size="12" fill="#ffffff">${rxText}</text>
  </g>

  <!-- Manufacturer (footer) -->
  ${manufacturer ? `<text x="${size / 2}" y="${size * 0.83}" text-anchor="middle"
        font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
        font-weight="500" font-size="14" fill="#64748b">by ${escapeXml(manufacturer)}</text>` : ''}

  <!-- Pharmacy watermark — proves provenance, deters anyone re-using these as competitor branding -->
  <text x="${size / 2}" y="${size - 20}" text-anchor="middle"
        font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
        font-weight="700" font-size="10" letter-spacing="2" fill="#cbd5e1">⚕ AMBICA MEDICAL</text>
</svg>`;
}

/**
 * Hash the inputs into a short stable string — used for ETag headers so HTTP
 * clients can revalidate cheaply. We don't import crypto here because this is
 * used in both edge and node contexts; the caller hashes if it wants an ETag.
 */
export function placeholderInputKey(input: PlaceholderInput): string {
  return [
    input.brand,
    input.name ?? '',
    input.manufacturer ?? '',
    input.dosage ?? '',
    input.category ?? '',
    input.rxRequired ? '1' : '0',
    String(input.size ?? 480),
  ].join('|');
}
