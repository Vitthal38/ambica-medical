/**
 * Browser- and server-safe helpers for building medicine image URLs.
 *
 * Two URL families:
 *
 *   1. Real image (admin-uploaded)  →  /api/medicines/{id}/image
 *      Returns a 302 redirect to the stored binary (Vercel Blob or local).
 *      Cached for one day at the CDN; admin upload re-bumps the ETag.
 *
 *   2. Placeholder                  →  /api/placeholder/medicine?b=…&n=…
 *      Deterministic SVG built from the product's existing catalog fields.
 *      Cached forever (the query IS the identity).
 *
 *   The catalog JSON's product.imageUrl wins over both when present (legacy
 *   path for manufacturer-supplied images already in the repo).
 *
 *   Pure functions — no React, no Next imports — so they can be used from
 *   server components, client components, and node scripts alike.
 */

import type { Product } from '@/features/products/types';

interface MinimalProduct {
  id: string;
  brand: string;
  name?: string;
  manufacturer?: string;
  dosage?: string;
  category?: string;
  rxRequired?: boolean;
  imageUrl?: string;
}

/** Build a `/api/placeholder/medicine` URL from a product. Strips empties. */
export function placeholderUrl(p: MinimalProduct, size: 240 | 320 | 480 | 640 | 800 = 480): string {
  const params = new URLSearchParams();
  if (p.brand) params.set('b', p.brand);
  if (p.name) params.set('n', p.name);
  if (p.manufacturer) params.set('m', p.manufacturer);
  if (p.dosage) params.set('d', p.dosage);
  if (p.category) params.set('c', p.category);
  if (p.rxRequired) params.set('r', '1');
  if (size !== 480) params.set('s', String(size));
  return `/api/placeholder/medicine?${params.toString()}`;
}

/**
 * Best primary image URL for a product. Order of preference:
 *
 *   1. Admin-uploaded image (served via /api/medicines/{id}/image)
 *      — only used if the product is known to have one. The catalog flag is
 *        a future field; until then we fall through to (2).
 *   2. Catalog-supplied imageUrl
 *      — legacy field, used when the JSON already has a manufacturer URL.
 *   3. Auto-generated SVG placeholder
 *      — always present, always renders, never 404s.
 */
export function medicineImageUrl(p: MinimalProduct): string {
  return p.imageUrl ?? placeholderUrl(p);
}

/** Convenience: extract just the fields we need from a fat Product. */
export function toImageInput(p: Product): MinimalProduct {
  return {
    id: p.id,
    brand: p.brand,
    name: p.name,
    manufacturer: p.manufacturer,
    dosage: p.dosage,
    category: p.category,
    rxRequired: p.rxRequired,
    imageUrl: p.imageUrl,
  };
}
