/**
 * Prescriptions list + create.
 *
 * Upload pipeline (POST):
 *   1. Auth + role check (PHARMACIST minimum).
 *   2. Multipart body parse with explicit content-type check.
 *   3. Size cap enforced BEFORE buffering (rejects files > MAX_FILE_SIZE).
 *   4. Browser-reported MIME validated against the allowlist (cheap check).
 *   5. Magic-byte validation — confirms file CONTENT matches the claimed
 *      type (defeats polyglot/HTML-as-image attacks).
 *   6. Random storage key (16 bytes hex) — name is never derived from user
 *      input, so no path traversal is possible.
 *   7. File stored under .private/ outside the web root.
 *   8. DB insert is wrapped — on failure we delete the orphan file.
 *   9. Audit log entry recorded.
 *   10. `storageKey` stripped from the response (client uses the id-based
 *       download URL).
 */
import { NextResponse } from 'next/server';
import { requireRole, jsonError } from '@/lib/api-auth';
import { prescriptionCreateMeta } from '@/features/admin/schemas';
import { MAX_FILE_SIZE } from '@/lib/validate';
import {
  listPrescriptions,
  createPrescription,
} from '@/lib/services/prescriptions';
import { sniffUpload, ALLOWED_UPLOAD_MIME } from '@/lib/security/file-validation';
import { audit } from '@/lib/audit';
import { safeError } from '@/lib/error-envelope';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET(req: Request) {
  try {
    const auth = await requireRole('PHARMACIST');
    if ('response' in auth) return auth.response;

    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId') ?? undefined;
    const status =
      (searchParams.get('status') as 'ACTIVE' | 'EXPIRED' | 'ARCHIVED' | null) ?? undefined;
    const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? '50'), 1), 200);
    const cursor = searchParams.get('cursor') ?? undefined;

    const data = await listPrescriptions({ customerId, status, limit, cursor });
    return NextResponse.json(data);
  } catch (e) {
    return safeError(e, req, { route: 'prescriptions_list' });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireRole('PHARMACIST');
    if ('response' in auth) return auth.response;

    const ct = req.headers.get('content-type') ?? '';
    if (!ct.startsWith('multipart/form-data')) {
      return jsonError('Expected multipart/form-data', 415);
    }

    const form = await req.formData();
    const file = form.get('file');
    const metaRaw = form.get('meta');

    if (!(file instanceof File)) return jsonError('Missing file', 400);
    if (typeof metaRaw !== 'string') return jsonError('Missing meta', 400);

    // ---- Size cap (cheap pre-read check) ----
    if (file.size > MAX_FILE_SIZE) {
      return jsonError(`File too large. Max ${MAX_FILE_SIZE / 1024 / 1024} MB.`, 413);
    }
    if (file.size <= 0) {
      return jsonError('Empty file rejected.', 400);
    }

    // ---- Browser-reported MIME against the allowlist (early reject) ----
    if (!(ALLOWED_UPLOAD_MIME as readonly string[]).includes(file.type)) {
      return jsonError(`Unsupported file type: ${file.type}`, 415);
    }

    // ---- Read into memory (size already capped above) ----
    const bytes = Buffer.from(await file.arrayBuffer());

    // ---- Magic-byte content validation ----
    const sniff = sniffUpload(bytes, file.type);
    if (!sniff.ok) {
      return jsonError(sniff.error, 415);
    }

    // ---- Meta payload validation ----
    let metaParsed: unknown;
    try {
      metaParsed = JSON.parse(metaRaw);
    } catch {
      return jsonError('meta is not valid JSON', 400);
    }
    const parsed = prescriptionCreateMeta.safeParse(metaParsed);
    if (!parsed.success) {
      return jsonError('Validation failed', 422, {
        fieldErrors: parsed.error.flatten().fieldErrors,
      });
    }

    const record = await createPrescription({
      ...parsed.data,
      expiryDate: parsed.data.expiryDate || null,
      uploadedById: auth.user.id,
      // Use the sniff-confirmed MIME (defense-in-depth — we trust our sniff
      // over the browser-reported value).
      file: { bytes, mimeType: sniff.mimeType },
    });

    await audit(
      { req, actor: auth.user },
      {
        action: 'PRESCRIPTION_CREATE',
        targetType: 'Prescription',
        targetId: record.id,
        meta: {
          customerId: record.customerId,
          mimeType: record.mimeType,
          fileSize: record.fileSize,
          fileHash: record.fileHash,
        },
      },
    );

    // Strip storageKey from the response.
    const { storageKey: _, ...safe } = record;
    return NextResponse.json({ prescription: safe }, { status: 201 });
  } catch (e) {
    return safeError(e, req, { route: 'prescriptions_create' });
  }
}
