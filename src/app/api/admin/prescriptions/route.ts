import { NextResponse } from 'next/server';
import { requireRole, jsonError } from '@/lib/api-auth';
import { prescriptionCreateMeta } from '@/features/admin/schemas';
import { ALLOWED_TYPES, MAX_FILE_SIZE } from '@/lib/validate';
import {
  listPrescriptions,
  createPrescription,
} from '@/lib/services/prescriptions';

export const runtime = 'nodejs';
export const maxDuration = 30;     // file uploads can take longer than 10s

export async function GET(req: Request) {
  const auth = await requireRole('PHARMACIST');
  if ('response' in auth) return auth.response;

  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get('customerId') ?? undefined;
  const status =
    (searchParams.get('status') as 'ACTIVE' | 'EXPIRED' | 'ARCHIVED' | null) ?? undefined;
  const limit = Number(searchParams.get('limit') ?? '50');
  const cursor = searchParams.get('cursor') ?? undefined;

  const data = await listPrescriptions({ customerId, status, limit, cursor });
  return NextResponse.json(data);
}

/**
 * Multipart upload: meta as JSON in field `meta`, file in field `file`.
 * Validation:
 *  - meta is parsed against the zod schema
 *  - file size and MIME type reuse the public-flow constants
 */
export async function POST(req: Request) {
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

  if (file.size > MAX_FILE_SIZE) {
    return jsonError(`File too large. Max ${MAX_FILE_SIZE / 1024 / 1024} MB.`, 413);
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return jsonError(`Unsupported file type: ${file.type}`, 415);
  }

  let meta: unknown;
  try {
    meta = JSON.parse(metaRaw);
  } catch {
    return jsonError('meta is not valid JSON', 400);
  }
  const parsed = prescriptionCreateMeta.safeParse(meta);
  if (!parsed.success) {
    return jsonError('Validation failed', 422, { fieldErrors: parsed.error.flatten().fieldErrors });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const record = await createPrescription({
    ...parsed.data,
    expiryDate: parsed.data.expiryDate || null,
    uploadedById: auth.user.id,
    file: { bytes, mimeType: file.type },
  });

  // Never echo the storageKey back — the client uses the id-based download URL.
  const { storageKey: _, ...safe } = record;
  return NextResponse.json({ prescription: safe }, { status: 201 });
}
