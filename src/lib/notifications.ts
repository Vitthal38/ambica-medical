/**
 * Outbound notifications — two distinct flows:
 *
 * 1. dispatchOrderConfirmation() — fan-out after checkout (SMS + WhatsApp + Email)
 * 2. dispatchReminderNotification() — single-channel refill reminder
 *
 * Both are stubs today. To activate a channel, set the corresponding env vars
 * and replace the TODO block inside the relevant send* function.
 *
 * Provider swap checklist:
 *   WhatsApp : Set WHATSAPP_API_TOKEN + WHATSAPP_FROM_NUMBER, implement sendReminderWhatsApp()
 *   SMS      : Set MSG91_API_KEY + MSG91_SENDER_ID  (or TWILIO_* variant), implement sendReminderSms()
 *   Email    : Set RESEND_API_KEY + NOTIFICATION_FROM_EMAIL, implement sendReminderEmail()
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

/* ─── Order-confirmation (fan-out across all channels) ─────────────────────── */

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

/* ─── Reminder notification (single channel, chosen per reminder) ───────────── */

export interface ReminderDispatchInput {
  customer: { name: string; phone: string; email?: string | null };
  medicine: { name: string; brand: string };
  /** Channel stored on the RefillReminder row */
  channel: 'SMS' | 'WHATSAPP' | 'EMAIL';
  /** Optional pharmacist note — overrides the default template when set */
  customMessage?: string | null;
}

function buildReminderMessage(input: ReminderDispatchInput): string {
  if (input.customMessage?.trim()) return input.customMessage.trim();
  return (
    `Hello ${input.customer.name}, this is a reminder from Ambica Medical that it may be ` +
    `time to refill your ${input.medicine.brand} – ${input.medicine.name}. ` +
    `Please visit us or call if you need assistance. Thank you!`
  );
}

async function sendReminderWhatsApp(input: ReminderDispatchInput): Promise<DispatchResult> {
  const message = buildReminderMessage(input);
  const apiToken = process.env.WHATSAPP_API_TOKEN;
  const apiUrl = process.env.WHATSAPP_API_URL;

  if (!apiToken || !apiUrl) {
    return { channel: 'whatsapp', target: maskPhone(input.customer.phone), status: 'skipped', reason: 'WHATSAPP_API_TOKEN not configured' };
  }

  // TODO: Replace with actual Meta Cloud API / Gupshup call.
  // Example (Meta Cloud API):
  //   const res = await fetch(apiUrl, {
  //     method: 'POST',
  //     headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
  //     body: JSON.stringify({
  //       messaging_product: 'whatsapp',
  //       to: `91${input.customer.phone}`,
  //       type: 'text',
  //       text: { body: message },
  //     }),
  //   });
  //   if (!res.ok) throw new Error(`WhatsApp API error: ${res.status}`);

  void message; // suppress unused-variable lint until wired
  return { channel: 'whatsapp', target: maskPhone(input.customer.phone), status: 'queued' };
}

async function sendReminderSms(input: ReminderDispatchInput): Promise<DispatchResult> {
  const message = buildReminderMessage(input);
  const msg91Key = process.env.MSG91_API_KEY;
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;

  if (!msg91Key && !twilioSid) {
    return { channel: 'sms', target: maskPhone(input.customer.phone), status: 'skipped', reason: 'SMS provider not configured' };
  }

  // TODO: Replace with actual SMS gateway call.
  // MSG91 example:
  //   const res = await fetch('https://api.msg91.com/api/v5/flow/', {
  //     method: 'POST',
  //     headers: { authkey: msg91Key!, 'Content-Type': 'application/json' },
  //     body: JSON.stringify({
  //       template_id: process.env.MSG91_TEMPLATE_ID,
  //       sender: process.env.MSG91_SENDER_ID || 'AMBICA',
  //       mobiles: `91${input.customer.phone}`,
  //       VAR1: input.customer.name,
  //       VAR2: `${input.medicine.brand} – ${input.medicine.name}`,
  //     }),
  //   });

  void message;
  return { channel: 'sms', target: maskPhone(input.customer.phone), status: 'queued' };
}

async function sendReminderEmail(input: ReminderDispatchInput): Promise<DispatchResult> {
  if (!input.customer.email) {
    return { channel: 'email', target: '—', status: 'skipped', reason: 'no email on file' };
  }

  const message = buildReminderMessage(input);
  const resendKey = process.env.RESEND_API_KEY;

  if (!resendKey) {
    return { channel: 'email', target: maskEmail(input.customer.email), status: 'skipped', reason: 'RESEND_API_KEY not configured' };
  }

  // TODO: Replace with actual Resend / SendGrid / SES call.
  // Resend example:
  //   const res = await fetch('https://api.resend.com/emails', {
  //     method: 'POST',
  //     headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
  //     body: JSON.stringify({
  //       from: process.env.NOTIFICATION_FROM_EMAIL || 'noreply@ambicamedical.in',
  //       to: input.customer.email,
  //       subject: 'Medicine Refill Reminder — Ambica Medical',
  //       text: message,
  //     }),
  //   });

  void message;
  return { channel: 'email', target: maskEmail(input.customer.email), status: 'queued' };
}

/**
 * Dispatch a single-channel refill reminder notification.
 * Returns the result so callers can persist sentAt and update the reminder status.
 */
export async function dispatchReminderNotification(
  input: ReminderDispatchInput,
): Promise<DispatchResult> {
  switch (input.channel) {
    case 'WHATSAPP':
      return sendReminderWhatsApp(input);
    case 'SMS':
      return sendReminderSms(input);
    case 'EMAIL':
      return sendReminderEmail(input);
  }
}
