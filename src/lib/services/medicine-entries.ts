/**
 * Direct medicine entries — manual / OTC records for a customer that do NOT
 * require a prescription upload. Used by the "Add medicine" quick-add flow.
 *
 * Listed alongside order purchases in the customer medicine timeline.
 */
import { prisma } from '@/lib/db';
import type { EntryType } from '@/features/admin/schemas';

export interface CreateMedicineEntryInput {
  customerId: string;
  medicineId: string;
  quantity: number;
  dosage?: string;
  notes?: string;
  entryDate: string;   // ISO date
  entryType: EntryType;
  recordedById: string;
}

export async function createMedicineEntry(input: CreateMedicineEntryInput) {
  return prisma.medicineEntry.create({
    data: {
      customerId: input.customerId,
      medicineId: input.medicineId,
      quantity: input.quantity,
      dosage: input.dosage?.trim() || null,
      notes: input.notes?.trim() || null,
      entryDate: new Date(input.entryDate),
      entryType: input.entryType,
      recordedById: input.recordedById,
    },
    include: { medicine: true },
  });
}

export interface ListEntriesFilters {
  customerId: string;
  limit?: number;
}

export async function listMedicineEntries(filters: ListEntriesFilters) {
  return prisma.medicineEntry.findMany({
    where: { customerId: filters.customerId },
    orderBy: { entryDate: 'desc' },
    take: Math.min(filters.limit ?? 100, 500),
    include: {
      medicine: true,
      recordedBy: { select: { id: true, name: true } },
    },
  });
}

export interface UpdateMedicineEntryInput {
  quantity?: number;
  dosage?: string | null;
  notes?: string | null;
  entryDate?: string;
  entryType?: EntryType;
}

/**
 * Update a single timeline entry. Scoped to its customer to defeat ID-guessing
 * — calling code must pass both the entry id AND the customer id from the URL.
 * Returns null if the entry doesn't belong to that customer.
 */
export async function updateMedicineEntry(
  customerId: string,
  entryId: string,
  input: UpdateMedicineEntryInput,
) {
  const existing = await prisma.medicineEntry.findFirst({
    where: { id: entryId, customerId },
    select: { id: true },
  });
  if (!existing) return null;

  return prisma.medicineEntry.update({
    where: { id: entryId },
    data: {
      ...(input.quantity !== undefined && { quantity: input.quantity }),
      ...(input.dosage !== undefined && { dosage: input.dosage?.trim() || null }),
      ...(input.notes !== undefined && { notes: input.notes?.trim() || null }),
      ...(input.entryDate !== undefined && { entryDate: new Date(input.entryDate) }),
      ...(input.entryType !== undefined && { entryType: input.entryType }),
    },
    include: { medicine: true },
  });
}

/** Hard delete — these aren't legal records like prescriptions; just timeline notes. */
export async function deleteMedicineEntry(customerId: string, entryId: string) {
  const existing = await prisma.medicineEntry.findFirst({
    where: { id: entryId, customerId },
    select: { id: true },
  });
  if (!existing) return false;
  await prisma.medicineEntry.delete({ where: { id: entryId } });
  return true;
}

/**
 * Medicine-catalog search — used by the autocomplete in the quick-add modal.
 * Matches prefix on brand OR name. Returns lightweight shape only.
 */
export async function searchMedicines(q: string, limit = 20) {
  const term = q.trim();
  if (!term) return [];
  return prisma.medicine.findMany({
    where: {
      OR: [
        { brand: { contains: term, mode: 'insensitive' } },
        { name: { contains: term, mode: 'insensitive' } },
      ],
    },
    orderBy: [{ brand: 'asc' }, { name: 'asc' }],
    take: Math.min(limit, 50),
    select: {
      id: true,
      brand: true,
      name: true,
      dosage: true,
      dosageForm: true,
      pack: true,
      rxRequired: true,
    },
  });
}
