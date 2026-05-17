import { Rocket, Lock, Stethoscope, BadgeCheck } from 'lucide-react';
import { Container } from '@/components/layout/Container';

const FEATURES = [
  {
    icon: Rocket,
    title: 'Express Delivery',
    desc: 'Same-day delivery within Aurangabad city limits.',
    tint: 'bg-primary-50 text-primary-700',
  },
  {
    icon: Lock,
    title: 'Verified Medicines',
    desc: 'All products sourced from licensed distributors only.',
    tint: 'bg-accent-50 text-accent-700',
  },
  {
    icon: Stethoscope,
    title: 'Pharmacist Review',
    desc: 'Expert review for all prescription submissions.',
    tint: 'bg-rose-50 text-rose-700',
  },
  {
    icon: BadgeCheck,
    title: 'Genuine Products',
    desc: '100% authentic with manufacturer warranty.',
    tint: 'bg-amber-50 text-amber-700',
  },
];

export function WhyChooseUs() {
  return (
    <section className="border-t border-neutral-100 bg-neutral-50/60 py-14">
      <Container>
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
            Why Choose Ambica Medical?
          </h2>
          <p className="mt-1 text-sm text-neutral-600">Built on trust, driven by care</p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="flex flex-col items-start gap-4 rounded-2xl border border-neutral-200/70 bg-white p-6 shadow-card transition-shadow duration-200 hover:shadow-cardHover"
            >
              <span
                className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${f.tint}`}
              >
                <f.icon className="h-6 w-6" strokeWidth={1.75} />
              </span>
              <div>
                <h3 className="text-base font-semibold text-neutral-900">{f.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-neutral-600">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
