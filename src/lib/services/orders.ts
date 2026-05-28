import { prisma } from '@/lib/db';
import { createRemindersForOrder } from '@/lib/services/reminders';
import { logger } from '@/lib/logger';

export interface CreateOrderInput {
  customerId: string;
  paymentMethod?: 'UPI' | 'CARD' | 'NETBANKING' | 'COD' | 'STORE';
  notes?: string;
  items: Array<{
    medicineId: string;
    quantity: number;
    unitPricePaise: number;
  }>;
  createdById: string;
}

/** Produce a human-readable order code, e.g. AMB-100234. */
function newOrderCode(): string {
  const n = 100000 + Math.floor(Math.random() * 900000);
  return `AMB-${n}`;
}

export async function createOrder(input: CreateOrderInput) {
  const subtotalPaise = input.items.reduce(
    (acc, i) => acc + i.unitPricePaise * i.quantity,
    0,
  );
  const totalPaise = subtotalPaise;

  // Snapshot brand/name at purchase time
  const meds = await prisma.medicine.findMany({
    where: { id: { in: input.items.map((i) => i.medicineId) } },
    select: { id: true, name: true, brand: true },
  });
  const byId = new Map(meds.map((m) => [m.id, m]));

  const order = await prisma.order.create({
    data: {
      code: newOrderCode(),
      customerId: input.customerId,
      paymentMethod: input.paymentMethod ?? 'STORE',
      notes: input.notes?.trim() || null,
      subtotalPaise,
      totalPaise,
      createdById: input.createdById,
      items: {
        create: input.items.map((i) => {
          const m = byId.get(i.medicineId);
          if (!m) throw new Error(`Unknown medicine: ${i.medicineId}`);
          return {
            medicineId: i.medicineId,
            quantity: i.quantity,
            unitPricePaise: i.unitPricePaise,
            totalPaise: i.unitPricePaise * i.quantity,
            nameSnapshot: m.name,
            brandSnapshot: m.brand,
          };
        }),
      },
    },
    include: { items: true, customer: { select: { name: true, phone: true } } },
  });

  // Fire-and-forget: a failed reminder must never fail the sale
  createRemindersForOrder(order.id, input.customerId, input.items, order.placedAt).catch((err) =>
    logger.warn('reminder.auto_create.failed', { orderId: order.id, error: String(err) }),
  );

  return order;
}

export async function listOrders(opts: { customerId?: string; limit?: number } = {}) {
  const limit = Math.min(opts.limit ?? 50, 200);
  return prisma.order.findMany({
    where: opts.customerId ? { customerId: opts.customerId } : undefined,
    orderBy: { placedAt: 'desc' },
    take: limit,
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      items: true,
    },
  });
}

export async function getOrderById(id: string) {
  return prisma.order.findUnique({
    where: { id },
    include: {
      customer: true,
      items: { include: { medicine: true } },
    },
  });
}

/**
 * Aggregate every medicine touched by a customer — across both order purchases
 * AND direct manual/OTC entries. Powers the "medicine timeline" view.
 *
 *   - source: 'ORDER'  → row came from an order item
 *   - source: 'ENTRY'  → row came from a direct medicine entry; carries entryType
 *     (PRESCRIPTION | MANUAL | OTC) so the UI can render a badge.
 */
export type MedicineTouch =
  | {
      source: 'ORDER';
      date: Date;
      qty: number;
      orderCode: string;
    }
  | {
      source: 'ENTRY';
      date: Date;
      qty: number;
      entryType: 'PRESCRIPTION' | 'MANUAL' | 'OTC';
      dosage: string | null;
      notes: string | null;
    };

export interface MedicineHistoryRow {
  medicineId: string;
  name: string;
  brand: string;
  touches: MedicineTouch[];
  totalQty: number;
}

export async function getMedicineHistoryForCustomer(
  customerId: string,
): Promise<MedicineHistoryRow[]> {
  const [orderItems, entries] = await Promise.all([
    prisma.orderItem.findMany({
      where: { order: { customerId } },
      orderBy: { order: { placedAt: 'desc' } },
      include: {
        order: { select: { placedAt: true, code: true } },
        medicine: true,
      },
    }),
    prisma.medicineEntry.findMany({
      where: { customerId },
      orderBy: { entryDate: 'desc' },
      include: { medicine: true },
    }),
  ]);

  const buckets = new Map<string, MedicineHistoryRow>();
  const upsert = (key: string, name: string, brand: string): MedicineHistoryRow => {
    const existing = buckets.get(key);
    if (existing) return existing;
    const fresh: MedicineHistoryRow = { medicineId: key, name, brand, touches: [], totalQty: 0 };
    buckets.set(key, fresh);
    return fresh;
  };

  for (const it of orderItems) {
    const b = upsert(it.medicineId, it.medicine.name, it.medicine.brand);
    b.touches.push({
      source: 'ORDER',
      date: it.order.placedAt,
      qty: it.quantity,
      orderCode: it.order.code,
    });
    b.totalQty += it.quantity;
  }

  for (const e of entries) {
    const b = upsert(e.medicineId, e.medicine.name, e.medicine.brand);
    b.touches.push({
      source: 'ENTRY',
      date: e.entryDate,
      qty: e.quantity,
      entryType: e.entryType,
      dosage: e.dosage,
      notes: e.notes,
    });
    b.totalQty += e.quantity;
  }

  // Sort touches newest-first inside each bucket; sort buckets by recency.
  for (const b of buckets.values()) {
    b.touches.sort((x, y) => y.date.getTime() - x.date.getTime());
  }
  return [...buckets.values()].sort((a, b) => {
    const aLatest = a.touches[0]?.date.getTime() ?? 0;
    const bLatest = b.touches[0]?.date.getTime() ?? 0;
    return bLatest - aLatest;
  });
}
