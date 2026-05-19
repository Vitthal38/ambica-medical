import { Prisma } from '@prisma/client';
import crypto from 'node:crypto';
import { prisma } from '@/lib/db';
import { storage } from '@/lib/storage';

/** Sentinel storage-key for prescriptions whose bytes live in the DB column. */
const DB_BLOB_KEY = 'db';

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

/**
 * Persist a prescription + its file bytes.
 *
 * Bytes are stored inline in the `Prescription.fileBytes` Postgres column.
 *
 * Why DB-inline and not S3 / Vercel Blob:
 *   - Works on serverless (Vercel) out of the box — no extra service to
 *     provision, no new env vars, no inter-service consistency window.
 *   - Files are PHI. Keeping them in the same Render Postgres that already
 *     holds the patient record means one fewer vendor handles patient data
 *     and one fewer subject-access-request boundary to chase. Indian data-
 *     residency stays clean.
 *   - The bytes are capped at 5 MB at the API layer (MAX_FILE_SIZE), so
 *     Postgres BYTEA is the right primitive — well-supported, transactionally
 *     atomic with the row insert.
 *
 * Reads MUST explicitly select `fileBytes`. Default queries omit it so
 * list views don't accidentally pull megabytes into memory.
 *
 * If the catalog grows past ~50K prescriptions and the DB starts to feel
 * heavy on backups, we move bytes out to object storage (Vercel Blob /
 * R2) and migrate by streaming each row's bytes -> new storage and
 * setting `storageKey` to the new path. The migration is incremental
 * because of the storageKey discriminator.
 */
export async function createPrescription(input: CreatePrescriptionInput) {
  const fileHash = crypto.createHash('sha256').update(input.file.bytes).digest('hex');

  return prisma.prescription.create({
    data: {
      customerId: input.customerId,
      doctorName: input.doctorName?.trim() || null,
      doctorReg: input.doctorReg?.trim() || null,
      issueDate: new Date(input.issueDate),
      expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
      notes: input.notes?.trim() || null,
      storageKey: DB_BLOB_KEY,
      fileBytes: input.file.bytes,
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

/**
 * Reads the file bytes for download. Caller is responsible for auth checks.
 *
 * Dispatch:
 *   - storageKey === 'db'  → fetch from Prescription.fileBytes column
 *   - anything else        → fetch from the file-system storage adapter
 *                            (legacy path, kept so old rows still download)
 *
 * The caller passes the prescription id so we can hit Postgres for the
 * inline-bytes case without needing a separate select round trip.
 */
export async function readPrescriptionFile(
  prescriptionId: string,
  storageKey: string,
): Promise<Buffer> {
  if (storageKey === DB_BLOB_KEY) {
    const row = await prisma.prescription.findUnique({
      where: { id: prescriptionId },
      select: { fileBytes: true },
    });
    if (!row?.fileBytes) {
      throw new Error('Prescription file bytes missing in DB');
    }
    // Prisma returns BYTEA as Buffer in Node — narrow the type for clarity.
    return Buffer.isBuffer(row.fileBytes) ? row.fileBytes : Buffer.from(row.fileBytes);
  }
  return storage.get(storageKey);
}
