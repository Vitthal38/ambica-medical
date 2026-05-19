/**
 * POST /api/admin/medicines/{id}/image/reject
 *
 * Marks the currently-uploaded image as REJECTED.
 *
 * The BYTES stay in storage (we never delete on reject — audit + post-mortem
 * value beats the few KB saved). What changes:
 *   - approvalStatus = REJECTED
 *   - imagePublicUrl = null         ← storefront falls back to placeholder
 *   - imageVerifiedAt = null
 *   - rejectionReason = the supplied string (or auto-fallback)
 *
 * Body:
 *   { "reason": "Wrong strength on pack (250 mg shown, SKU is 500 mg)" }
 */
import { NextResponse } from 'next/server';
import { requireRole, jsonError } from '@/lib/api-auth';
import { prisma } from '@/lib/db';
import { audit } from '@/lib/audit';

export const runtime = 'nodejs';

const MAX_REASON_LEN = 500;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole('PHARMACIST');
    if ('response' in auth) return auth.response;

    const { id } = await ctx.params;
    const med = await prisma.medicine.findUnique({
      where: { id },
      select: { id: true, imageStorageKey: true, approvalStatus: true },
    });
    if (!med) return jsonError('Medicine not found', 404);
    if (!med.imageStorageKey) return jsonError('No image uploaded to reject', 400);

    let body: { reason?: unknown } = {};
    try {
      const raw = await req.text();
      body = raw ? JSON.parse(raw) : {};
    } catch {
      return jsonError('Invalid JSON', 400);
    }

    let reason = typeof body.reason === 'string' ? body.reason.trim() : '';
    if (reason.length > MAX_REASON_LEN) reason = reason.slice(0, MAX_REASON_LEN);
    if (!reason) reason = 'Rejected by pharmacist (no reason supplied)';

    const updated = await prisma.medicine.update({
      where: { id },
      data: {
        approvalStatus: 'REJECTED',
        imagePublicUrl: null,
        imageVerifiedAt: null,
        rejectionReason: reason,
      },
      select: {
        id: true,
        approvalStatus: true,
        rejectionReason: true,
        imagePublicUrl: true,
      },
    });

    await audit(
      { req, actor: auth.user },
      {
        action: 'MEDICINE_IMAGE_REJECT',
        targetType: 'Medicine',
        targetId: id,
        meta: { prior: med.approvalStatus, reason },
      },
    );

    return NextResponse.json({ ok: true, medicine: updated });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : 'Reject failed', 500);
  }
}
