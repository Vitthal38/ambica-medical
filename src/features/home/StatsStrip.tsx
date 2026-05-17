import { Package, Truck, BadgeCheck } from 'lucide-react';
import { Container } from '@/components/layout/Container';

const STATS = [
  {
    icon: Package,
    metric: '1200+',
    label: 'Products',
  },
  {
    icon: Truck,
    metric: 'Same-Day',
    label: 'Delivery',
  },
  {
    icon: BadgeCheck,
    metric: 'Rx',
    label: 'Verified',
  },
];

export function StatsStrip() {
  return (
    <section className="border-y border-neutral-200 bg-white">
      <Container className="py-6">
        <div className="grid grid-cols-3 gap-4 divide-x divide-neutral-200">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="flex flex-col items-center justify-center gap-1 text-center first:pl-0 sm:flex-row sm:gap-3"
            >
              <s.icon className="h-5 w-5 text-primary-600 sm:h-6 sm:w-6" strokeWidth={1.75} />
              <div className="flex flex-col leading-tight sm:items-start">
                <span className="text-base font-bold text-neutral-900 sm:text-lg">{s.metric}</span>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500 sm:text-xs">
                  {s.label}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
