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
 *     limit      — page size, 1-100, default 50
 *     offset     — pagination
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

  const [items, total, counts] = await Promise.all([
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
  ]);

  return NextResponse.json({ items, total, offset, limit, counts });
}
