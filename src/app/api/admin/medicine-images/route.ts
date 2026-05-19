/**
 * GET /api/admin/medicine-images
 *
 * List view powering the admin image-management page. Distinct from the
 * existing `/api/admin/medicines` autocomplete endpoint — this one returns
 * image metadata alongside each medicine and supports filtering by image
 * verification status.
 *
 *   Query params:
 *     q          — substring match on brand or generic name
 *     status     — 'all' (default) | 'verified' | 'uploaded_unverified' | 'no_upload'
 *     approval   — 'all' (default) | 'pending' | 'needs_review' | 'approved' | 'rejected'
 *     limit      — page size, 1-100, default 50
 *     offset     — pagination
 *
 *   The response now includes:
 *     items[].approvalStatus, items[].copyrightStatus, items[].rejectionReason
 *     counts.byApproval = { PENDING, NEEDS_REVIEW, APPROVED, REJECTED }
 */
import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const auth = await requireRole('PHARMACIST');
  if ('response' in auth) return auth.response;

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') ?? '').trim();
  const status = searchParams.get('status') ?? 'all';
  const approval = (searchParams.get('approval') ?? 'all').toLowerCase();
  const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? '50'), 1), 100);
  const offset = Math.max(Number(searchParams.get('offset') ?? '0'), 0);

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { brand: { contains: q, mode: 'insensitive' } },
      { name: { contains: q, mode: 'insensitive' } },
    ];
  }
  if (status === 'verified') {
    where.imageVerifiedAt = { not: null };
    where.imageStorageKey = { not: null };
  } else if (status === 'uploaded_unverified') {
    where.imageStorageKey = { not: null };
    where.imageVerifiedAt = null;
  } else if (status === 'no_upload') {
    where.imageStorageKey = null;
  }

  const APPROVAL_TOKENS: Record<string, string> = {
    pending: 'PENDING',
    needs_review: 'NEEDS_REVIEW',
    approved: 'APPROVED',
    rejected: 'REJECTED',
  };
  if (approval in APPROVAL_TOKENS) {
    where.approvalStatus = APPROVAL_TOKENS[approval];
  }

  const [items, total, counts, byApproval] = await Promise.all([
    prisma.medicine.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }],
      skip: offset,
      take: limit,
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
        imageConfidence: true,
        imageSource: true,
        imageWidth: true,
        imageHeight: true,
        imageBytes: true,
        imagePhash: true,
        approvalStatus: true,
        copyrightStatus: true,
        rejectionReason: true,
        ocrMatchedAt: true,
      },
    }),
    prisma.medicine.count({ where }),
    Promise.all([
      prisma.medicine.count(),
      prisma.medicine.count({ where: { imageVerifiedAt: { not: null }, imageStorageKey: { not: null } } }),
      prisma.medicine.count({ where: { imageStorageKey: { not: null }, imageVerifiedAt: null } }),
      prisma.medicine.count({ where: { imageStorageKey: null } }),
    ]).then(([all, verified, uploadedUnverified, noUpload]) => ({
      all,
      verified,
      uploadedUnverified,
      noUpload,
    })),
    // Per-approval-status counts, used to render the queue-badge in the nav.
    Promise.all([
      prisma.medicine.count({ where: { approvalStatus: 'PENDING' } }),
      prisma.medicine.count({ where: { approvalStatus: 'NEEDS_REVIEW' } }),
      prisma.medicine.count({ where: { approvalStatus: 'APPROVED' } }),
      prisma.medicine.count({ where: { approvalStatus: 'REJECTED' } }),
    ]).then(([PENDING, NEEDS_REVIEW, APPROVED, REJECTED]) => ({
      PENDING,
      NEEDS_REVIEW,
      APPROVED,
      REJECTED,
    })),
  ]);

  return NextResponse.json({ items, total, offset, limit, counts, byApproval });
}
