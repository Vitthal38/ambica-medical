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
 * Reminders coming due within `daysAhead` days, ordered by dueness. Powers
 * the dashboard "Refill due" widget.
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
