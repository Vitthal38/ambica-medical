import { prisma } from '@/lib/db';

export interface CreateReminderInput {
  customerId: string;
  medicineId: string;
  sourceOrderId?: string;
  dueOn: string;        // ISO date
  channel?: 'NONE' | 'SMS' | 'WHATSAPP' | 'EMAIL';
  message?: string;
}

export async function createReminder(input: CreateReminderInput) {
  return prisma.refillReminder.create({
    data: {
      customerId: input.customerId,
      medicineId: input.medicineId,
      sourceOrderId: input.sourceOrderId,
      dueOn: new Date(input.dueOn),
      channel: input.channel ?? 'NONE',
      message: input.message?.trim() || null,
    },
  });
}

/**
 * Auto-create one reminder per unique medicine after an order is placed.
 * dueOn = placedAt + 30 days.
 * Called fire-and-forget from createOrder() — failures are logged, not thrown.
 */
export async function createRemindersForOrder(
  orderId: string,
  customerId: string,
  items: Array<{ medicineId: string }>,
  placedAt: Date,
): Promise<void> {
  const dueOn = new Date(placedAt.getTime() + 30 * 86_400_000);

  // Look up customer email to set a useful default channel immediately
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { email: true },
  });
  const defaultChannel = customer?.email ? ('EMAIL' as const) : ('NONE' as const);

  // Deduplicate: one reminder per unique medicine per order
  const seen = new Set<string>();
  const unique = items.filter((i) => {
    if (seen.has(i.medicineId)) return false;
    seen.add(i.medicineId);
    return true;
  });

  await prisma.refillReminder.createMany({
    data: unique.map((i) => ({
      customerId,
      medicineId: i.medicineId,
      sourceOrderId: orderId,
      dueOn,
      channel: defaultChannel,
      status: 'PENDING' as const,
    })),
  });
}

export interface ListRemindersOpts {
  status?: 'PENDING' | 'SENT' | 'FULFILLED' | 'DISMISSED' | 'ALL';
  q?: string;               // search by customer name or phone
  from?: Date;
  to?: Date;
  daysAhead?: number;       // convenience: sets to = now + N days
  limit?: number;
  cursor?: string;
  failedAttemptsBefore?: number; // exclude reminders with failedAttempts >= this value
}

export interface ReminderRow {
  id: string;
  dueOn: Date;
  status: string;
  channel: string;
  message: string | null;
  sentAt: Date | null;
  failedAttempts: number;
  createdAt: Date;
  customer: { id: string; name: string; phone: string; email: string | null };
  medicine: { id: string; name: string; brand: string };
  sourceOrderId: string | null;
}

/**
 * Full-featured list for the reminder management dashboard.
 * Supports search by customer name/phone, status filter, date range, pagination.
 */
export async function listReminders(opts: ListRemindersOpts = {}): Promise<{
  rows: ReminderRow[];
  nextCursor: string | null;
}> {
  const limit = Math.min(opts.limit ?? 50, 200);
  const status = opts.status ?? 'ALL';

  // Build date range
  let from: Date | undefined = opts.from;
  let to: Date | undefined = opts.to;
  if (opts.daysAhead !== undefined) {
    to = new Date(Date.now() + opts.daysAhead * 86_400_000);
  }

  // Build the where clause
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {};

  if (status !== 'ALL') {
    where.status = status;
  }
  if (from || to) {
    where.dueOn = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
  }
  if (opts.cursor) {
    where.id = { gt: opts.cursor };
  }
  if (opts.failedAttemptsBefore !== undefined) {
    where.failedAttempts = { lt: opts.failedAttemptsBefore };
  }

  // Customer search: filter via relation
  if (opts.q?.trim()) {
    const q = opts.q.trim();
    const isExactPhone = /^[6-9]\d{9}$/.test(q);
    if (isExactPhone) {
      where.customer = { phone: q };
    } else {
      where.customer = {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q } },
        ],
      };
    }
  }

  const rows = await prisma.refillReminder.findMany({
    where,
    orderBy: { dueOn: 'asc' },
    take: limit + 1,
    include: {
      customer: { select: { id: true, name: true, phone: true, email: true } },
      medicine: { select: { id: true, name: true, brand: true } },
    },
  });

  let nextCursor: string | null = null;
  if (rows.length > limit) {
    const last = rows.pop()!;
    nextCursor = last.id;
  }

  return { rows: rows as ReminderRow[], nextCursor };
}

/**
 * Reminders coming due within `daysAhead` days, ordered by dueness.
 * Powers the dashboard "Refill due" widget.
 */
export async function listDueReminders(daysAhead = 7) {
  const cutoff = new Date(Date.now() + daysAhead * 86_400_000);
  return prisma.refillReminder.findMany({
    where: { status: 'PENDING', dueOn: { lte: cutoff } },
    orderBy: { dueOn: 'asc' },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      medicine: true,
    },
    take: 100,
  });
}

export async function getReminderById(id: string) {
  return prisma.refillReminder.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, name: true, phone: true, email: true } },
      medicine: { select: { id: true, name: true, brand: true } },
    },
  });
}

export async function setReminderStatus(
  id: string,
  status: 'PENDING' | 'SENT' | 'FULFILLED' | 'DISMISSED',
) {
  return prisma.refillReminder.update({
    where: { id },
    data: {
      status,
      sentAt: status === 'SENT' ? new Date() : undefined,
    },
  });
}

/**
 * Atomically increment failedAttempts after a dispatch exception.
 * Reminder stays PENDING so it can be retried — until failedAttempts >= MAX_ATTEMPTS.
 */
export async function incrementFailedAttempts(id: string): Promise<void> {
  await prisma.refillReminder.update({
    where: { id },
    data: {
      failedAttempts: { increment: 1 },
    },
  });
}

export async function updateReminder(
  id: string,
  data: {
    status?: 'PENDING' | 'SENT' | 'FULFILLED' | 'DISMISSED';
    channel?: 'NONE' | 'SMS' | 'WHATSAPP' | 'EMAIL';
    message?: string | null;
    dueOn?: string;
    failedAttempts?: number;
  },
) {
  return prisma.refillReminder.update({
    where: { id },
    data: {
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.channel !== undefined ? { channel: data.channel } : {}),
      ...(data.message !== undefined ? { message: data.message || null } : {}),
      ...(data.dueOn !== undefined ? { dueOn: new Date(data.dueOn) } : {}),
      ...(data.status === 'SENT' ? { sentAt: new Date() } : {}),
      ...(data.failedAttempts !== undefined ? { failedAttempts: data.failedAttempts } : {}),
    },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      medicine: { select: { id: true, name: true, brand: true } },
    },
  });
}

/**
 * Count reminders whose dispatch has been exhausted (failedAttempts >= maxAttempts).
 * Used by the reminders list API to surface an operational health indicator.
 */
export async function countExhaustedReminders(maxAttempts: number): Promise<number> {
  return prisma.refillReminder.count({
    where: {
      status: 'PENDING',
      failedAttempts: { gte: maxAttempts },
    },
  });
}
