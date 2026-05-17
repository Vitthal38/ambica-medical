/**
 * Stream prescription file bytes to an authenticated admin.
 *
 * Security layers:
 *   1. requireRole('PHARMACIST') — session + role + still-active check
 *   2. Audit log entry — EVERY file read is recorded with actor + IP + UA
 *      because the file IS Protected Health Information.
 *   3. The file lives outside `public/` and is only addressable by an opaque
 *      cuid-prefixed storage key (set server-side at upload time). This is
 *      the ONLY code path that reads the bytes.
 *   4. Response carries `X-Content-Type-Options: nosniff` to prevent
 *      browsers from re-interpreting bytes as HTML/JS.
 *   5. `Content-Disposition: attachment` flips the default to download
 *      rather than inline — additional XSS defense if a malicious upload
 *      somehow slipped past MIME validation.
 *   6. `Cache-Control: private, no-store` so caches never retain PHI.
 */
import { requireRole, jsonError } from '@/lib/api-auth';
import { getPrescriptionById, readPrescriptionFile } from '@/lib/services/prescriptions';
import { audit } from '@/lib/audit';
import { safeError } from '@/lib/error-envelope';

export const runtime = 'nodejs';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole('PHARMACIST');
    if ('response' in auth) return auth.response;

    const { id } = await params;
    const p = await getPrescriptionById(id);
    if (!p) return jsonError('Prescription not found', 404);

    const bytes = await readPrescriptionFile(p.storageKey);

    // PHI access — log before returning bytes (best-effort, won't block).
    await audit(
      { req, actor: auth.user },
      {
        action: 'PRESCRIPTION_FILE_DOWNLOAD',
        targetType: 'Prescription',
        targetId: p.id,
        meta: { customerId: p.customerId, mimeType: p.mimeType, fileSize: p.fileSize },
      },
    );

    return new Response(new Uint8Array(bytes), {
      headers: {
        'Content-Type': p.mimeType,
        'Content-Length': String(bytes.length),
        // Force download. Filename does NOT include patient data — just the id.
        'Content-Disposition': `attachment; filename="rx-${p.id}"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        'Cross-Origin-Resource-Policy': 'same-origin',
      },
    });
  } catch (e) {
    return safeError(e, req, { route: 'prescription_file' });
  }
}
