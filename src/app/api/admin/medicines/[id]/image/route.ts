/**
 * Admin medicine-image endpoints.
 *
 *   POST   /api/admin/medicines/{id}/image   multipart file → upload + optimize
 *   DELETE /api/admin/medicines/{id}/image                    → revert to placeholder
 *   PATCH  /api/admin/medicines/{id}/image   {confidence, source, sourceUrl, verified: boolean}
 *
 * All three require PHARMACIST role minimum. Each writes an audit row.
 *
 * The POST handler is the security-critical one — every byte the client sends
 * is funnelled through src/lib/medicine-images/pipeline.ts before it touches
 * storage or the DB. No "raw" persistence path exists.
 *
 * On a successful upload, if another Medicine has the same perceptual hash
 * we DO NOT block — we surface a warning in the response. The pharmacist
 * makes the call: same pack-shot legitimately used for two strengths is
 * common in pharma catalogs.
 */
import { NextResponse } from 'next/server';
import { requireRole, jsonError } from '@/lib/api-auth';
import { prisma } from '@/lib/db';
import { audit } from '@/lib/audit';
import { processMedicineImage, MAX_UPLOAD_BYTES } from '@/lib/medicine-images/pipeline';
import { getMedicineImageStorage } from '@/lib/medicine-images/storage';

export const runtime = 'nodejs';
// Cap the body size at the API layer in addition to the per-file cap.
// Vercel's default is 4.5 MB; we override here so the multipart can carry
// the full 8 MB pipeline ceiling.
export const maxDuration = 30;

const ALLOWED_SOURCES = new Set(['admin_upload', 'manufacturer', 'own_photo', 'stock_licensed']);

// ---- POST ------------------------------------------------------------------

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole('PHARMACIST');
    if ('response' in auth) return auth.response;

    const { id } = await ctx.params;
    const med = await prisma.medicine.findUnique({ where: { id }, select: { id: true, brand: true } });
    if (!med) return jsonError('Medicine not found', 404);

    // Parse multipart. Form fields the UI sends:
    //   file:       the image
    //   source:     'admin_upload' | 'manufacturer' | 'own_photo' | 'stock_licensed'
    //   sourceUrl:  optional attribution URL
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return jsonError('Expected multipart/form-data', 400);
    }
    const file = form.get('file');
    if (!(file instanceof File)) return jsonError('Missing "file" field', 400);

    // Pre-pipeline byte cap — bail before reading the entire stream into memory
    // if the declared size is already over the limit.
    if (file.size > MAX_UPLOAD_BYTES) {
      return jsonError(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`, 413);
    }

    const sourceRaw = (form.get('source') as string | null) ?? 'admin_upload';
    const source = ALLOWED_SOURCES.has(sourceRaw) ? sourceRaw : 'admin_upload';
    const sourceUrl = (form.get('sourceUrl') as string | null)?.trim() || null;
    if (sourceUrl && (sourceUrl.length > 1024 || !/^https?:\/\//i.test(sourceUrl))) {
      return jsonError('sourceUrl must be a valid http(s) URL under 1024 chars', 400);
    }

    const bytes = Buffer.from(await file.arrayBuffer());

    // Run the validation + optimization pipeline
    const result = await processMedicineImage({
      bytes,
      declaredMime: file.type || 'application/octet-stream',
      medicineId: med.id,
      source,
    });

    if (!result.ok) {
      // Audit even the rejection — useful when investigating an admin complaint.
      await audit(
        { req, actor: auth.user },
        {
          action: 'MEDICINE_IMAGE_UPLOAD',
          targetType: 'Medicine',
          targetId: med.id,
          meta: { rejected: true, code: result.code, declaredMime: file.type, declaredBytes: file.size },
        },
      );
      const status = result.code === 'too_large' || result.code === 'too_large_dimensions' ? 413 : 400;
      return jsonError(result.message, status, { code: result.code });
    }

    // Duplicate detection — non-blocking warning
    const dupes = await prisma.medicine.findMany({
      where: {
        imagePhash: result.phash,
        id: { not: med.id },
      },
      select: { id: true, brand: true, name: true },
      take: 5,
    });

    // Delete the previous file (if any) so storage doesn't accumulate orphans.
    // We do this AFTER the upload so a storage hiccup on remove doesn't cost
    // us the new image.
    const previous = await prisma.medicine.findUnique({
      where: { id: med.id },
      select: { imageStorageKey: true },
    });
    if (previous?.imageStorageKey && previous.imageStorageKey !== result.storageKey) {
      await getMedicineImageStorage().remove(previous.imageStorageKey).catch(() => {});
    }

    // Persist atomically.
    const updated = await prisma.medicine.update({
      where: { id: med.id },
      data: {
        imageStorageKey: result.storageKey,
        imagePublicUrl: result.publicUrl,
        imageMime: result.mime,
        imageWidth: result.width,
        imageHeight: result.height,
        imageBytes: result.bytes,
        imagePhash: result.phash,
        imageSha256: result.sha256,
        imageSource: source,
        imageSourceUrl: sourceUrl,
        // Upload is treated as "tentatively verified by uploader" with mid
        // confidence; the pharmacist can bump to 100 via PATCH after review.
        imageConfidence: 70,
        imageVerifiedAt: new Date(),
        imageOptimizedAt: new Date(),
      },
      select: {
        id: true,
        imagePublicUrl: true,
        imageMime: true,
        imageWidth: true,
        imageHeight: true,
        imageBytes: true,
        imagePhash: true,
        imageSource: true,
        imageConfidence: true,
        imageVerifiedAt: true,
      },
    });

    await audit(
      { req, actor: auth.user },
      {
        action: 'MEDICINE_IMAGE_UPLOAD',
        targetType: 'Medicine',
        targetId: med.id,
        meta: {
          bytes: result.bytes,
          width: result.width,
          height: result.height,
          source,
          phash: result.phash,
          duplicates: dupes.length,
        },
      },
    );

    return NextResponse.json({
      ok: true,
      medicine: updated,
      warnings: dupes.length
        ? [
            {
              code: 'duplicate_phash',
              message: `${dupes.length} other medicine(s) have the same perceptual hash. Verify this is the correct pack-shot.`,
              medicines: dupes,
            },
          ]
        : [],
    });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : 'Upload failed', 500);
  }
}

// ---- DELETE ----------------------------------------------------------------

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole('PHARMACIST');
    if ('response' in auth) return auth.response;

    const { id } = await ctx.params;
    const med = await prisma.medicine.findUnique({
      where: { id },
      select: { id: true, imageStorageKey: true },
    });
    if (!med) return jsonError('Medicine not found', 404);

    if (med.imageStorageKey) {
      await getMedicineImageStorage().remove(med.imageStorageKey).catch(() => {});
    }

    await prisma.medicine.update({
      where: { id },
      data: {
        imageStorageKey: null,
        imagePublicUrl: null,
        imageMime: null,
        imageWidth: null,
        imageHeight: null,
        imageBytes: null,
        imagePhash: null,
        imageSha256: null,
        imageSource: null,
        imageSourceUrl: null,
        imageConfidence: null,
        imageVerifiedAt: null,
        imageOptimizedAt: null,
      },
    });

    await audit(
      { req, actor: auth.user },
      { action: 'MEDICINE_IMAGE_DELETE', targetType: 'Medicine', targetId: id },
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : 'Delete failed', 500);
  }
}

// ---- PATCH (verify / re-score) --------------------------------------------

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole('PHARMACIST');
    if ('response' in auth) return auth.response;

    const { id } = await ctx.params;
    const med = await prisma.medicine.findUnique({
      where: { id },
      select: { id: true, imageStorageKey: true },
    });
    if (!med) return jsonError('Medicine not found', 404);
    if (!med.imageStorageKey) return jsonError('Medicine has no uploaded image to verify', 400);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonError('Invalid JSON', 400);
    }
    const b = (body ?? {}) as Record<string, unknown>;

    const data: Record<string, unknown> = {};
    if (typeof b.confidence === 'number' && b.confidence >= 0 && b.confidence <= 100) {
      data.imageConfidence = Math.round(b.confidence);
    }
    if (typeof b.source === 'string' && ALLOWED_SOURCES.has(b.source)) {
      data.imageSource = b.source;
    }
    if (typeof b.sourceUrl === 'string') {
      const url = b.sourceUrl.trim();
      if (url && (!/^https?:\/\//i.test(url) || url.length > 1024)) {
        return jsonError('sourceUrl must be valid http(s) under 1024 chars', 400);
      }
      data.imageSourceUrl = url || null;
    }
    if (b.verified === true) data.imageVerifiedAt = new Date();
    if (b.verified === false) data.imageVerifiedAt = null;

    if (Object.keys(data).length === 0) return jsonError('No updatable fields supplied', 400);

    const updated = await prisma.medicine.update({
      where: { id },
      data,
      select: { imageConfidence: true, imageSource: true, imageSourceUrl: true, imageVerifiedAt: true },
    });

    await audit(
      { req, actor: auth.user },
      {
        action: 'MEDICINE_IMAGE_VERIFY',
        targetType: 'Medicine',
        targetId: id,
        meta: { fields: Object.keys(data) },
      },
    );

    return NextResponse.json({ ok: true, medicine: updated });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : 'Verify failed', 500);
  }
}
