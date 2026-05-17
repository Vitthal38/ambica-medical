'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Package, ArrowRight, Receipt } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useOrderStore } from '@/features/checkout/orderStore';
import type { Order } from '@/features/checkout/types';
import { formatPrice } from '@/lib/formatPrice';

function fmtDate(epoch: number): string {
  return new Date(epoch).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default function OrderHistoryPage() {
  const ordersById = useOrderStore((s) => s.orders);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  if (!hydrated) {
    return (
      <Container className="flex min-h-[60svh] items-center justify-center py-16">
        <div className="text-sm text-neutral-400">Loading…</div>
      </Container>
    );
  }

  const orders: Order[] = Object.values(ordersById).sort((a, b) => b.placedAt - a.placedAt);

  if (orders.length === 0) {
    return (
      <Container className="flex min-h-[60svh] flex-col items-center justify-center py-16 text-center">
        <span className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-50 text-primary-700">
          <Receipt className="h-9 w-9" strokeWidth={1.75} />
        </span>
        <h1 className="mt-6 text-2xl font-bold">No orders yet</h1>
        <p className="mt-2 max-w-sm text-sm text-neutral-600">
          Orders you place will appear here. Your history is stored locally on this device.
        </p>
        <Link href="/products" className="mt-5">
          <Button>Browse products</Button>
        </Link>
      </Container>
    );
  }

  return (
    <Container className="py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your orders</h1>
          <p className="mt-1 text-sm text-neutral-600">
            {orders.length} {orders.length === 1 ? 'order' : 'orders'} on this device
          </p>
        </div>
        <Link href="/products">
          <Button variant="outline">Continue shopping</Button>
        </Link>
      </div>

      <ul className="mt-8 space-y-3">
        {orders.map((o) => (
          <li key={o.id}>
            <Link href={`/order/${o.id}`}>
              <article className="flex flex-wrap items-center gap-4 rounded-2xl border border-neutral-200/70 bg-white p-4 shadow-card transition-colors hover:border-primary-300">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
                  <Package className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-baseline gap-3">
                    <p className="font-mono text-sm font-semibold text-neutral-900">{o.id}</p>
                    <Badge tone={o.status === 'delivered' ? 'success' : 'neutral'}>
                      {o.status}
                    </Badge>
                    {o.requiresPrescription && <Badge tone="rx">Rx</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-neutral-500">
                    {fmtDate(o.placedAt)} ·{' '}
                    {o.items.length} {o.items.length === 1 ? 'item' : 'items'} ·{' '}
                    {o.deliveryType === 'store-pickup' ? 'Store pickup' : 'Home delivery'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold tabular-nums">{formatPrice(o.total)}</p>
                  <p className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-primary-700">
                    View details <ArrowRight className="h-3 w-3" />
                  </p>
                </div>
              </article>
            </Link>
          </li>
        ))}
      </ul>
    </Container>
  );
}
