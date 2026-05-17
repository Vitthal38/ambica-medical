import { Prisma } from '@prisma/client';
import crypto from 'node:crypto';
import { prisma } from '@/lib/db';
import { storage, extensionFor } from '@/lib/storage';

export interface CreatePrescriptionInput {
  customerId: string;
  doctorName?: string;
  doctorReg?: string;
  issueDate: string;
  expiryDate?: string | null;
  notes?: string;
  /** Catalog medicine IDs to link to this prescription. */
  medicineIds?: string[];
  uploadedById: string;
  file: {
    bytes: Buffer;
    mimeType: string;
  };
}

export async function createPrescription(input: CreatePrescriptionInput) {
  const ext = extensionFor(input.file.mimeType);
  const fileHash = crypto.createHash('sha256').update(input.file.bytes).digest('hex');
  const storageKey = await storage.put(input.file.bytes, {
    mimeType: input.file.mimeType,
    extension: ext,
  });

  try {
    return await prisma.prescription.create({
      data: {
        customerId: input.customerId,
        doctorName: input.doctorName?.trim() || null,
        doctorReg: input.doctorReg?.trim() || null,
        issueDate: new Date(input.issueDate),
        expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
        notes: input.notes?.trim() || null,
        storageKey,
        mimeType: input.file.mimeType,
        fileSize: input.file.bytes.length,
        fileHash,
        uploadedById: input.uploadedById,
        medicines: input.medicineIds?.length
          ? {
              create: input.medicineIds.map((medicineId) => ({
                medicineId,
              })),
            }
          : undefined,
      },
      include: {
        medicines: { include: { medicine: true } },
      },
    });
  } catch (err) {
    // If the DB insert fails, don't leave an orphan file.
    await storage.remove(storageKey).catch(() => undefined);
    throw err;
  }
}

export interface ListPrescriptionFilters {
  customerId?: string;
  status?: 'ACTIVE' | 'EXPIRED' | 'ARCHIVED';
  limit?: number;
  cursor?: string;
}

export async function listPrescriptions(filters: ListPrescriptionFilters = {}) {
  const limit = Math.min(filters.limit ?? 50, 200);
  const where: Prisma.PrescriptionWhereInput = {};
  if (filters.customerId) where.customerId = filters.customerId;
  if (filters.status) where.status = filters.status;

  const rows = await prisma.prescription.findMany({
    where,
    orderBy: { issueDate: 'desc' },
    take: limit + 1,
    ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      medicines: { include: { medicine: true } },
    },
  });

  const nextCursor = rows.length > limit ? rows.pop()!.id : null;
  return { rows, nextCursor };
}

export async function getPrescriptionById(id: string) {
  return prisma.prescription.findUnique({
    where: { id },
    include: {
      customer: true,
      medicines: { include: { medicine: true } },
      uploadedBy: { select: { id: true, name: true, email: true } },
    },
  });
}

/** Reads the file bytes for download. Caller is responsible for auth checks. */
export async function readPrescriptionFile(storageKey: string) {
  return storage.get(storageKey);
}
