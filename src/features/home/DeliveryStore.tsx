import { Truck, Store, Check, MapPin } from 'lucide-react';
import { Container } from '@/components/layout/Container';

const HOME_BENEFITS = [
  'Same-day city delivery',
  'Free above ₹500',
  'Live order tracking',
  'Tamper-proof packaging',
];

const PICKUP_BENEFITS = [
  'Ready in 30 minutes',
  'No delivery charges',
  'Pay at store option',
  'Priority queue',
];

export function DeliveryStore() {
  return (
    <section className="bg-white py-14">
      <Container>
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
            Delivery & Store
          </h2>
          <p className="mt-1 text-sm text-neutral-600">Get your medicines wherever you are</p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {/* Home Delivery */}
          <div className="rounded-2xl border border-neutral-200/70 bg-white p-7 shadow-card">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
              <Truck className="h-6 w-6" strokeWidth={1.75} />
            </span>
            <h3 className="mt-4 text-xl font-semibold">Home Delivery</h3>
            <p className="mt-2 text-sm text-neutral-600">
              Same-day delivery within Aurangabad. Order before 2 PM. Free delivery on orders above
              ₹500.
            </p>
            <ul className="mt-5 space-y-2 text-sm">
              {HOME_BENEFITS.map((b) => (
                <li key={b} className="flex items-center gap-2 text-neutral-700">
                  <Check className="h-4 w-4 text-primary-600" strokeWidth={2.5} /> {b}
                </li>
              ))}
            </ul>
          </div>

          {/* Store Pickup */}
          <div className="rounded-2xl border border-neutral-200/70 bg-white p-7 shadow-card">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent-50 text-accent-700">
              <Store className="h-6 w-6" strokeWidth={1.75} />
            </span>
            <h3 className="mt-4 text-xl font-semibold">Store Pickup</h3>
            <p className="mt-2 text-sm text-neutral-600">
              Order online and pick up at our Aurangabad store in just 30 minutes. No delivery
              charges.
            </p>
            <ul className="mt-5 space-y-2 text-sm">
              {PICKUP_BENEFITS.map((b) => (
                <li key={b} className="flex items-center gap-2 text-neutral-700">
                  <Check className="h-4 w-4 text-accent-600" strokeWidth={2.5} /> {b}
                </li>
              ))}
            </ul>
          </div>

          {/* Find Us */}
          <div className="rounded-2xl border border-neutral-200/70 bg-gradient-to-br from-neutral-900 to-neutral-800 p-7 text-white shadow-card">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
              <MapPin className="h-6 w-6" strokeWidth={1.75} />
            </span>
            <h3 className="mt-4 text-xl font-semibold">Find Us</h3>
            <p className="mt-2 text-sm text-neutral-300">Trimurti Chowk, Aurangabad</p>
            <dl className="mt-5 space-y-3 text-sm">
              <div>
                <dt className="text-[11px] uppercase tracking-widest text-neutral-400">Address</dt>
                <dd className="mt-1 text-neutral-100">
                  Jawahar Colony, Trimurti Chowk,
                  <br /> Near Hegdewar Hospital, Aurangabad 431001
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-widest text-neutral-400">Phone</dt>
                <dd className="mt-1 text-neutral-100">+91 99999 00000</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-widest text-neutral-400">Hours</dt>
                <dd className="mt-1 text-neutral-100">Mon–Sat 8AM–9PM · Sun 9AM–6PM</dd>
              </div>
            </dl>
          </div>
        </div>
      </Container>
    </section>
  );
}
