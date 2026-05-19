/**
 * POST /api/admin/medicines/{id}/image/approve
 *
 * Marks the currently-uploaded image as APPROVED and surfaces it to the
 * storefront by populating imagePublicUrl from the stored bytes.
 *
 * Body (optional):
 *   {
 *     "confidence": 0..100,          // overrides any prior composite score
 *     "copyrightStatus": "OWNED_BY_PHARMACY" | "MANUFACTURER_AUTHORIZED" | ...
 *   }
 *
 * Behaviour:
 *   - Requires PHARMACIST role.
 *   - 400 if no image is currently uploaded (imageStorageKey is null).
 *   - Writes audit row MEDICINE_IMAGE_APPROVE.
 *   - Idempotent: approving an already-approved image is a no-op success.
 */
import { NextResponse } from 'next/server';
import { requireRole, jsonError } from '@/lib/api-auth';
import { prisma } from '@/lib/db';
import { audit } from '@/lib/audit';

export const runtime = 'nodejs';

const COPYRIGHT_VALUES = new Set([
  'UNKNOWN',
  'OWNED_BY_PHARMACY',
  'MANUFACTURER_AUTHORIZED',
  'DISTRIBUTOR_CONTRACT',
  'STOCK_LICENSED',
]);

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole('PHARMACIST');
    if ('response' in auth) return auth.response;

    const { id } = await ctx.params;
    const med = await prisma.medicine.findUnique({
      where: { id },
      select: {
        id: true,
        imageStorageKey: true,
        imagePublicUrl: true,
        approvalStatus: true,
      },
    });
    if (!med) return jsonError('Medicine not found', 404);
    if (!med.imageStorageKey) return jsonError('No image uploaded to approve', 400);

    let body: Record<string, unknown> = {};
    try {
      const raw = await req.text();
      body = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    } catch {
      return jsonError('Invalid JSON', 400);
    }

    const patch: Record<string, unknown> = {
      approvalStatus: 'APPROVED',
      imageVerifiedAt: new Date(),
      rejectionReason: null,
    };

    if (typeof body.confidence === 'number' && body.confidence >= 0 && body.confidence <= 100) {
      patch.imageConfidence = Math.round(body.confidence);
    }
    if (typeof body.copyrightStatus === 'string' && COPYRIGHT_VALUES.has(body.copyrightStatus)) {
      patch.copyrightStatus = body.copyrightStatus;
    }

    const updated = await prisma.medicine.update({
      where: { id },
      data: patch,
      select: {
        id: true,
        approvalStatus: true,
        copyrightStatus: true,
        imageConfidence: true,
        imageVerifiedAt: true,
        imagePublicUrl: true,
      },
    });

    await audit(
      { req, actor: auth.user },
      {
        action: 'MEDICINE_IMAGE_APPROVE',
        targetType: 'Medicine',
        targetId: id,
        meta: {
          prior: med.approvalStatus,
          confidence: updated.imageConfidence,
          copyrightStatus: updated.copyrightStatus,
        },
      },
    );

    return NextResponse.json({ ok: true, medicine: updated });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : 'Approve failed', 500);
  }
}
