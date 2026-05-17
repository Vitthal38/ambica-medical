import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

export interface CustomerListFilters {
  q?: string;        // prefix match on name or phone
  limit?: number;
  cursor?: string;   // pagination cursor
}

/**
 * Search customers by phone or name prefix.
 *  - exact phone match short-circuits to a fast indexed lookup.
 *  - name search uses case-insensitive contains.
 */
export async function listCustomers(filters: CustomerListFilters = {}) {
  const limit = Math.min(filters.limit ?? 50, 200);
  const q = filters.q?.trim();

  const where: Prisma.CustomerWhereInput = { deletedAt: null };

  if (q) {
    if (/^[6-9]\d{9}$/.test(q)) {
      where.phone = q;
    } else if (/^\+?\d{2,}/.test(q)) {
      where.phone = { startsWith: q.replace(/^\+/, '') };
    } else {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q } },
      ];
    }
  }

  const rows = await prisma.customer.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      createdAt: true,
      _count: { select: { orders: true, prescriptions: true } },
    },
  });

  const nextCursor = rows.length > limit ? rows.pop()!.id : null;
  return { rows, nextCursor };
}

export async function getCustomerById(id: string) {
  return prisma.customer.findFirst({
    where: { id, deletedAt: null },
    include: {
      prescriptions: {
        orderBy: { issueDate: 'desc' },
        include: { medicines: { include: { medicine: true } } },
      },
      orders: {
        orderBy: { placedAt: 'desc' },
        include: { items: true },
      },
      refillReminders: {
        where: { status: 'PENDING' },
        orderBy: { dueOn: 'asc' },
        include: { medicine: true },
      },
    },
  });
}

export interface CreateCustomerInput {
  name: string;
  phone: string;
  email?: string;
  dob?: string;        // ISO date
  address?: string;
  notes?: string;
  createdById: string;
}

export async function createCustomer(input: CreateCustomerInput) {
  return prisma.customer.create({
    data: {
      name: input.name.trim(),
      phone: input.phone,
      email: input.email?.trim() || null,
      dob: input.dob ? new Date(input.dob) : null,
      address: input.address?.trim() || null,
      notes: input.notes?.trim() || null,
      createdById: input.createdById,
    },
  });
}

export interface InitialMedicineEntry {
  medicineId: string;
  quantity: number;
  dosage?: string;
  notes?: string;
  entryDate: string;
  entryType: 'PRESCRIPTION' | 'MANUAL' | 'OTC';
}

/**
 * Create a customer and (optionally) a batch of initial medicine entries in
 * one atomic Postgres transaction. If any medicine entry fails (e.g. unknown
 * medicineId, FK violation), the customer insert is rolled back too — no
 * half-saved state.
 */
export async function createCustomerWithMedicines(
  input: CreateCustomerInput & { medicines?: InitialMedicineEntry[] },
) {
  const medicines = input.medicines ?? [];
  return prisma.$transaction(async (tx) => {
    const customer = await tx.customer.create({
      data: {
        name: input.name.trim(),
        phone: input.phone,
        email: input.email?.trim() || null,
        dob: input.dob ? new Date(input.dob) : null,
        address: input.address?.trim() || null,
        notes: input.notes?.trim() || null,
        createdById: input.createdById,
      },
    });

    if (medicines.length > 0) {
      // Verify every medicineId exists in one query before we start inserting
      // — gives a clean validation error instead of a P2003 FK violation halfway through.
      const ids = [...new Set(medicines.map((m) => m.medicineId))];
      const found = await tx.medicine.findMany({
        where: { id: { in: ids } },
        select: { id: true },
      });
      if (found.length !== ids.length) {
        const missing = ids.filter((id) => !found.some((f) => f.id === id));
        throw new Error(`Unknown medicineId(s): ${missing.join(', ')}`);
      }

      await tx.medicineEntry.createMany({
        data: medicines.map((m) => ({
          customerId: customer.id,
          medicineId: m.medicineId,
          quantity: m.quantity,
          dosage: m.dosage?.trim() || null,
          notes: m.notes?.trim() || null,
          entryDate: new Date(m.entryDate),
          entryType: m.entryType,
          recordedById: input.createdById,
        })),
      });
    }

    // Re-read with the entries attached so the API response is complete.
    return tx.customer.findUniqueOrThrow({
      where: { id: customer.id },
      include: {
        medicineEntries: { include: { medicine: true }, orderBy: { entryDate: 'desc' } },
      },
    });
  });
}

export interface UpdateCustomerInput {
  name?: string;
  phone?: string;
  email?: string | null;
  dob?: string | null;
  address?: string | null;
  notes?: string | null;
}

export async function updateCustomer(id: string, input: UpdateCustomerInput) {
  return prisma.customer.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.email !== undefined && { email: input.email?.trim() || null }),
      ...(input.dob !== undefined && { dob: input.dob ? new Date(input.dob) : null }),
      ...(input.address !== undefined && { address: input.address?.trim() || null }),
      ...(input.notes !== undefined && { notes: input.notes?.trim() || null }),
    },
  });
}

/** Soft delete — preserve history for compliance. */
export async function softDeleteCustomer(id: string) {
  return prisma.customer.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}
