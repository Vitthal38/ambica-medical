/**
 * GET /api/medicines/{id}/image
 *
 * Public image resolver. Hit by <img src=…> on storefront cards.
 *
 * Resolution order:
 *   1. Admin-uploaded image (Medicine.imagePublicUrl) — 302 redirect, fully cacheable
 *   2. Legacy catalog imageUrl (Medicine.imageUrl)    — 302 redirect
 *   3. Placeholder SVG (/api/placeholder/medicine?…)  — 302 redirect with cache
 *
 * Why redirect instead of proxy? Two reasons:
 *   - Proxying bytes through a serverless function costs CPU and bandwidth on
 *     every request. Vercel Blob / static files are served directly by Vercel's
 *     CDN with no function invocation.
 *   - A 302 with long Cache-Control means the browser remembers the redirect
 *     target for a day, so subsequent loads skip this function entirely.
 *
 * 24 h cache on the redirect itself; admin upload re-bumps the URL (storage
 * key contains the content hash) so users always see the latest after one
 * cache cycle.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { placeholderUrl } from '@/lib/medicine-images/client';

export const runtime = 'nodejs';

const REDIRECT_CACHE = 'public, max-age=86400, stale-while-revalidate=604800';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  // Cheap fast-path: medicine with only the image fields. Single index hit.
  const med = await prisma.medicine.findUnique({
    where: { id },
    select: {
      id: true,
      brand: true,
      name: true,
      manufacturer: true,
      dosage: true,
      category: true,
      rxRequired: true,
      imageUrl: true,
      imagePublicUrl: true,
      imageVerifiedAt: true,
    },
  });

  // Build a placeholder URL from whatever metadata we DO know — falls back to
  // a minimal version if the medicine isn't in the DB at all (covers storefront-
  // only catalog SKUs that haven't been synced).
  const placeholder = placeholderUrl({
    id,
    brand: med?.brand ?? 'Medicine',
    name: med?.name,
    manufacturer: med?.manufacturer ?? undefined,
    dosage: med?.dosage ?? undefined,
    category: med?.category,
    rxRequired: med?.rxRequired,
  });

  // Pick the best available source
  let target = placeholder;
  if (med?.imagePublicUrl && med?.imageVerifiedAt) {
    target = med.imagePublicUrl;
  } else if (med?.imageUrl) {
    target = med.imageUrl;
  }

  return NextResponse.redirect(new URL(target, _req.url), {
    status: 302,
    headers: { 'Cache-Control': REDIRECT_CACHE },
  });
}
