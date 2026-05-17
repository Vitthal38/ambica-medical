import { requireRole, jsonError } from '@/lib/api-auth';
import { getPrescriptionById, readPrescriptionFile } from '@/lib/services/prescriptions';

export const runtime = 'nodejs';

/**
 * Stream the prescription file bytes to the browser.
 *
 * Security:
 *  - Session + role checked via requireRole().
 *  - The file lives outside `public/`, accessed only by storageKey (an opaque
 *    UUID-pathed value), so this route is the ONLY way to read the bytes.
 *  - `Content-Disposition: inline` for preview; flip to `attachment` if you
 *    want to force download.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole('PHARMACIST');
  if ('response' in auth) return auth.response;

  const { id } = await params;
  const p = await getPrescriptionById(id);
  if (!p) return jsonError('Prescription not found', 404);

  const bytes = await readPrescriptionFile(p.storageKey);

  return new Response(new Uint8Array(bytes), {
    headers: {
      'Content-Type': p.mimeType,
      'Content-Length': String(bytes.length),
      'Content-Disposition': `inline; filename="rx-${p.id}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
