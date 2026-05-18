'use client';

import { useState, type FormEvent } from 'react';

const TOPICS = [
  'General enquiry',
  'Order or delivery status',
  'Prescription help',
  'Return or refund',
  'Privacy / data request',
  'Other',
] as const;

type Topic = (typeof TOPICS)[number];

interface FormState {
  name: string;
  phone: string;
  email: string;
  topic: Topic;
  message: string;
}

const INITIAL: FormState = {
  name: '',
  phone: '',
  email: '',
  topic: 'General enquiry',
  message: '',
};

/**
 * Contact form. No backend required — composes a mailto: URL with the
 * structured message body and hands off to the user's mail client. This keeps
 * the page useful from day one without adding email-service dependencies.
 *
 * If you wire up a real /api/contact endpoint later, swap the mailto for a
 * POST and use the same `body` formatter.
 */
export function ContactForm() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) return setError('Please tell us your name.');
    if (!form.phone.trim() && !form.email.trim())
      return setError('Please give us a phone number or email so we can reply.');
    if (form.message.trim().length < 10)
      return setError('Please share a few more details (at least 10 characters).');

    const subject = `[${form.topic}] from ${form.name.trim()}`;
    const lines = [
      `Name: ${form.name.trim()}`,
      form.phone.trim() && `Phone: ${form.phone.trim()}`,
      form.email.trim() && `Email: ${form.email.trim()}`,
      `Topic: ${form.topic}`,
      '',
      'Message:',
      form.message.trim(),
      '',
      '—',
      'Sent from ambica-medical.vercel.app/contact',
    ].filter(Boolean) as string[];

    const url =
      'mailto:care@ambicamedical.in' +
      `?subject=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(lines.join('\n'))}`;

    // open the user's default mail client
    window.location.href = url;
    setSent(true);
  }

  if (sent) {
    return (
      <div className="mt-4 rounded-xl border border-primary-200 bg-primary-50/60 p-5 text-sm">
        <p className="font-semibold text-primary-800">Thanks — your mail client should have opened.</p>
        <p className="mt-1.5 text-neutral-700">
          If nothing happened, please email{' '}
          <a
            className="font-medium text-primary-700 underline-offset-2 hover:underline"
            href="mailto:care@ambicamedical.in"
          >
            care@ambicamedical.in
          </a>{' '}
          directly, or WhatsApp us at{' '}
          <a
            className="font-medium text-primary-700 underline-offset-2 hover:underline"
            href="https://wa.me/919999900000"
            target="_blank"
            rel="noopener noreferrer"
          >
            +91 99999 00000
          </a>
          . We respond within working hours, typically under 30 minutes.
        </p>
        <button
          type="button"
          onClick={() => {
            setForm(INITIAL);
            setSent(false);
          }}
          className="mt-3 text-xs font-semibold text-primary-700 hover:underline"
        >
          Send another message
        </button>
      </div>
    );
  }

  const inputCls =
    'block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100';
  const labelCls = 'mb-1.5 block text-xs font-semibold uppercase tracking-wider text-neutral-700';

  return (
    <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
      <div>
        <label htmlFor="name" className={labelCls}>
          Your name *
        </label>
        <input
          id="name"
          type="text"
          required
          autoComplete="name"
          value={form.name}
          onChange={(e) => update('name', e.target.value)}
          className={inputCls}
          placeholder="e.g. Rohini Deshmukh"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="phone" className={labelCls}>
            Phone
          </label>
          <input
            id="phone"
            type="tel"
            autoComplete="tel"
            value={form.phone}
            onChange={(e) => update('phone', e.target.value)}
            className={inputCls}
            placeholder="+91 ..."
          />
        </div>
        <div>
          <label htmlFor="email" className={labelCls}>
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            className={inputCls}
            placeholder="you@example.com"
          />
        </div>
      </div>

      <div>
        <label htmlFor="topic" className={labelCls}>
          Topic
        </label>
        <select
          id="topic"
          value={form.topic}
          onChange={(e) => update('topic', e.target.value as Topic)}
          className={inputCls}
        >
          {TOPICS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="message" className={labelCls}>
          Message *
        </label>
        <textarea
          id="message"
          required
          rows={5}
          value={form.message}
          onChange={(e) => update('message', e.target.value)}
          className={inputCls + ' resize-y'}
          placeholder="Tell us what you need help with. Order numbers are helpful."
        />
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      <p className="text-[11px] text-neutral-500">
        By submitting, you agree to our{' '}
        <a href="/privacy-policy" className="text-primary-700 underline-offset-2 hover:underline">
          Privacy Policy
        </a>
        . We never share your details with third parties.
      </p>

      <button
        type="submit"
        className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-200"
      >
        Send message
      </button>
    </form>
  );
}
