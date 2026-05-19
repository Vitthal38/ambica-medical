import Link from 'next/link';
import { Container } from './Container';
import { Logo } from './Logo';
import { MapPin, Phone, Clock, Mail, ShieldCheck } from 'lucide-react';

const COLUMNS = [
  {
    title: 'Shop',
    links: [
      { to: '/category/fever-and-pain-relief', label: 'Fever & Pain' },
      { to: '/category/cold-cough-and-flu', label: 'Cold & Cough' },
      { to: '/category/diabetes-care', label: 'Diabetes Care' },
      { to: '/category/heart-and-bp', label: 'Heart & BP' },
      { to: '/category/vitamins-and-supplements', label: 'Vitamins' },
      { to: '/category/skin-care', label: 'Skin Care' },
      { to: '/category/first-aid-and-personal-care', label: 'First Aid' },
    ],
  },
  {
    title: 'Services',
    links: [
      { to: '/prescription', label: 'Upload Prescription' },
      { to: '/products', label: 'Home Delivery' },
      { to: '/products', label: 'Store Pickup' },
      { to: '/orders', label: 'Track Order' },
    ],
  },
  {
    title: 'Help',
    links: [
      { to: '/faq', label: 'FAQ' },
      { to: '/contact', label: 'Contact Us' },
      { to: '/return-policy', label: 'Return Policy' },
      { to: '/privacy-policy', label: 'Privacy Policy' },
      { to: '/terms-of-service', label: 'Terms of Service' },
      { to: '/image-credits', label: 'Image Credits' },
    ],
  },
];

const PAYMENT_METHODS = ['📱 UPI', '💳 Card', '🏦 Net Banking', '💵 Cash on Delivery'];

export function Footer() {
  return (
    <footer className="mt-22 border-t border-neutral-200 bg-white">
      <Container className="py-12">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Logo />
            <p className="mt-4 max-w-sm text-sm text-neutral-600 leading-relaxed">
              Your trusted local pharmacy, now online. Quality healthcare products at your fingertips in
              Aurangabad.
            </p>
            <ul className="mt-5 space-y-2 text-sm text-neutral-600">
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-600" strokeWidth={1.75} />
                <span>
                  Jawahar Colony, Trimurti Chowk,
                  <br />
                  Near Hegdewar Hospital,
                  <br />
                  Aurangabad 431001
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary-600" strokeWidth={1.75} />
                <span>+91 94204 02595</span>
              </li>
              <li className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary-600" strokeWidth={1.75} />
                <span>Mon–Sun 9AM–11PM</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary-600" strokeWidth={1.75} />
                <a href="mailto:care@ambicamedical.in" className="hover:text-primary-700">
                  care@ambicamedical.in
                </a>
              </li>
            </ul>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                {col.title}
              </h3>
              <ul className="mt-4 space-y-2.5 text-sm">
                {col.links.map((l) => (
                  <li key={`${col.title}-${l.label}`}>
                    <Link href={l.to} className="text-neutral-700 transition-colors hover:text-primary-700">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-neutral-200 pt-6 md:flex-row md:items-center">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="font-bold uppercase tracking-widest text-neutral-500">Payment</span>
            {PAYMENT_METHODS.map((m) => (
              <span
                key={m}
                className="rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-neutral-700"
              >
                {m}
              </span>
            ))}
          </div>
          <div className="inline-flex items-center gap-1.5 text-xs text-neutral-600">
            <ShieldCheck className="h-4 w-4 text-primary-600" strokeWidth={1.75} />
            256-bit SSL encrypted
          </div>
        </div>

        <div className="mt-8 border-t border-neutral-100 pt-6 text-center text-xs text-neutral-500">
          © 2025 Ambica Medical. All rights reserved. Licensed under the Maharashtra Pharmacy Act.
          <br className="md:hidden" />
          <span className="md:ml-2">Lic. No: MH-AUR-00001</span>
        </div>
      </Container>
    </footer>
  );
}
