/**
 * Outbound order-confirmation notifications.
 *
 * Architecture seam — every channel goes through the same envelope so the
 * success page can render "We've sent confirmation to …" copy from a single
 * source of truth.
 *
 * Today the dispatcher is a stub that just records intent. Swap in real
 * providers later (Twilio for SMS, Gupshup / Meta Cloud API for WhatsApp,
 * Resend / SES for email) by replacing the body of each `send*` function. The
 * call sites (Checkout, /order/[id]) keep working.
 */

import type { Order } from '@/features/checkout/types';

export type NotificationChannel = 'email' | 'sms' | 'whatsapp';

export interface DispatchResult {
  channel: NotificationChannel;
  target: string;            // masked recipient — e.g. "98****3210"
  status: 'sent' | 'queued' | 'skipped';
  reason?: string;
}

function maskPhone(raw: string): string {
  if (!raw || raw.length < 6) return '••••';
  return `${raw.slice(0, 2)}••••${raw.slice(-4)}`;
}

function maskEmail(raw: string): string {
  const [u, d] = raw.split('@');
  if (!u || !d) return '••••';
  const head = u.length <= 2 ? u : `${u[0]}${u[1]}`;
  return `${head}••••@${d}`;
}

async function sendEmail(order: Order): Promise<DispatchResult | null> {
  if (!order.customer.email) return null;
  // TODO: wire to your provider (Resend / SendGrid / SES).
  return {
    channel: 'email',
    target: maskEmail(order.customer.email),
    status: 'queued',
  };
}

async function sendSms(order: Order): Promise<DispatchResult> {
  // TODO: wire to your SMS gateway (MSG91, Twilio, Gupshup).
  return {
    channel: 'sms',
    target: maskPhone(order.customer.phone),
    status: 'queued',
  };
}

async function sendWhatsApp(order: Order): Promise<DispatchResult> {
  // TODO: wire to Meta Cloud API / Gupshup WhatsApp Business.
  return {
    channel: 'whatsapp',
    target: maskPhone(order.customer.phone),
    status: 'queued',
  };
}

/**
 * Fan out the order confirmation across enabled channels. Order success page
 * shows whatever this returns. Errors per-channel don't fail the whole call.
 */
export async function dispatchOrderConfirmation(order: Order): Promise<DispatchResult[]> {
  const settled = await Promise.allSettled([sendSms(order), sendWhatsApp(order), sendEmail(order)]);
  return settled
    .map((r) => (r.status === 'fulfilled' ? r.value : null))
    .filter((r): r is DispatchResult => r !== null);
}
