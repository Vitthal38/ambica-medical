/**
 * GET /api/medicines/file/{key}
 *
 * Local-FS serving route. Only meaningful when the medicine-image storage
 * backend is `local-fs` — in production with Vercel Blob, image URLs point
 * directly at the CDN and never come here.
 *
 * Security:
 *   - Key is URL-decoded once and then validated to be a SHA-prefix WebP path
 *     of the form `med/{medId}/{16hex}.webp`. Any other shape → 400. This
 *     defeats path traversal attempts (../../etc/passwd, encoded slashes, etc.)
 *     because the regex enumerates exactly what's allowed.
 *   - The storage reader stat()s before opening; missing files → 404 (never
 *     500), so a fuzzer can't enumerate the FS by error-message diffing.
 *   - Content-Type fixed to image/webp — the pipeline only stores WebPs.
 */
import { NextResponse } from 'next/server';
import { getLocalReader } from '@/lib/medicine-images/storage';

export const runtime = 'nodejs';

// `med/{medicineId}/{16-hex}.webp` — medicineId is alnum + dashes + dots, ≤ 64 chars
const KEY_RE = /^med\/[A-Za-z0-9._-]{1,64}\/[0-9a-f]{16}\.webp$/;

export async function GET(_req: Request, ctx: { params: Promise<{ key: string }> }) {
  const { key: encodedKey } = await ctx.params;
  let key: string;
  try {
    key = decodeURIComponent(encodedKey);
  } catch {
    return NextResponse.json({ error: 'Malformed key' }, { status: 400 });
  }

  if (!KEY_RE.test(key)) {
    return NextResponse.json({ error: 'Invalid storage key' }, { status: 400 });
  }

  const reader = getLocalReader();
  if (!reader) {
    return NextResponse.json(
      { error: 'Local FS backend not active (set BLOB_READ_WRITE_TOKEN or run dev)' },
      { status: 503 },
    );
  }

  const bytes = await reader.read(key);
  if (!bytes) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return new Response(new Uint8Array(bytes), {
    status: 200,
    headers: {
      'Content-Type': 'image/webp',
      // Content-addressable — key includes hash, so the bytes never change.
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
