import type { Metadata } from 'next';
import { Container } from '@/components/layout/Container';
import { ContactForm } from '@/features/contact/ContactForm';
import { MapPin, Phone, Mail, Clock, MessageCircle, ShieldCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Contact Us',
  description:
    'Reach Ambica Medical — phone, WhatsApp, email, or visit our Jawahar Colony store in Chhatrapati Sambhajinagar (Aurangabad). Our pharmacist responds within 30 minutes during working hours.',
};

const QUICK_CONTACTS = [
  {
    icon: Phone,
    label: 'Phone',
    value: '+91 99999 00000',
    href: 'tel:+919999900000',
    detail: 'Mon–Sat 8 AM – 9 PM · Sun 9 AM – 6 PM',
  },
  {
    icon: MessageCircle,
    label: 'WhatsApp',
    value: '+91 99999 00000',
    href: 'https://wa.me/919999900000',
    detail: 'Fastest channel for prescription queries',
  },
  {
    icon: Mail,
    label: 'Email (general)',
    value: 'care@ambicamedical.in',
    href: 'mailto:care@ambicamedical.in',
    detail: 'Reply within one working day',
  },
  {
    icon: ShieldCheck,
    label: 'Grievance Officer',
    value: 'grievance@ambicamedical.in',
    href: 'mailto:grievance@ambicamedical.in',
    detail: 'Privacy and compliance escalations',
  },
];

export default function ContactPage() {
  return (
    <>
      <section className="bg-gradient-to-b from-primary-50/40 to-transparent py-10 md:py-14">
        <Container className="max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-primary-700">
            📞 Contact
          </span>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            We’re here, in person and online.
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-neutral-600 sm:text-base">
            Walk in to the Jawahar Colony store, call, WhatsApp, or send a message — a registered
            pharmacist responds during working hours.
          </p>
        </Container>
      </section>

      <section className="pb-16">
        <Container className="max-w-5xl">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              {QUICK_CONTACTS.map((c) => {
                const Icon = c.icon;
                return (
                  <a
                    key={c.label}
                    href={c.href}
                    target={c.href.startsWith('http') ? '_blank' : undefined}
                    rel={c.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className="block rounded-2xl border border-neutral-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-md"
                  >
                    <div className="flex items-start gap-4">
                      <div className="rounded-xl bg-primary-50 p-2.5 text-primary-700">
                        <Icon className="h-5 w-5" strokeWidth={1.75} />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                          {c.label}
                        </div>
                        <div className="mt-0.5 font-semibold text-neutral-900">{c.value}</div>
                        <div className="mt-1 text-xs text-neutral-600">{c.detail}</div>
                      </div>
                    </div>
                  </a>
                );
              })}

              <div className="rounded-2xl border border-neutral-200 bg-white p-5">
                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-primary-50 p-2.5 text-primary-700">
                    <MapPin className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                      Visit the store
                    </div>
                    <address className="mt-1 not-italic text-sm text-neutral-700 leading-relaxed">
                      Ambica Medical<br />
                      Jawahar Colony, Trimurti Chowk<br />
                      Near Hegdewar Hospital<br />
                      Chhatrapati Sambhajinagar (Aurangabad)<br />
                      Maharashtra 431001
                    </address>
                    <a
                      href="https://www.google.com/maps/search/?api=1&query=Hegdewar+Hospital+Aurangabad"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-block text-xs font-semibold text-primary-700 hover:underline"
                    >
                      Open in Google Maps →
                    </a>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-neutral-200 bg-white p-5">
                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-primary-50 p-2.5 text-primary-700">
                    <Clock className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                      Working hours
                    </div>
                    <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-4 text-sm text-neutral-700">
                      <dt>Monday – Saturday</dt><dd>8:00 AM – 9:00 PM</dd>
                      <dt>Sunday</dt><dd>9:00 AM – 6:00 PM</dd>
                      <dt>Public holidays</dt><dd>9:00 AM – 1:00 PM (emergency on-call)</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="rounded-2xl border border-neutral-200 bg-white p-6">
                <h2 className="text-lg font-bold tracking-tight">Send us a message</h2>
                <p className="mt-1 text-sm text-neutral-600">
                  For prescription queries, attach a photo via WhatsApp instead — it’s faster.
                </p>
                <ContactForm />
              </div>

              <p className="mt-4 text-center text-xs text-neutral-500">
                For medical emergencies, please dial <strong>108</strong> (Maharashtra ambulance) or
                go to the nearest hospital. This site is not for emergency medical advice.
              </p>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
