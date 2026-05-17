'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Truck,
  Store,
  Clock3,
  Wallet,
  CreditCard,
  Banknote,
  Landmark,
  Stethoscope,
  Home,
  Package,
  Download,
  ListOrdered,
  MessageCircle,
  Mail,
  Phone,
  ShieldCheck,
} from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import { Tile } from '@/components/ui/Tile';
import { Badge } from '@/components/ui/Badge';
import { useOrderStore } from '@/features/checkout/orderStore';
import type { PaymentMethod } from '@/features/checkout/schema';
import { formatPrice } from '@/lib/formatPrice';
import {
  dispatchOrderConfirmation,
  type DispatchResult,
  type NotificationChannel,
} from '@/lib/notifications';

const PAYMENT_LABEL: Record<PaymentMethod, { label: string; icon: typeof Wallet }> = {
  upi: { label: 'UPI', icon: Wallet },
  card: { label: 'Card', icon: CreditCard },
  netbanking: { label: 'Net Banking', icon: Landmark },
  cod: { label: 'Cash on Delivery', icon: Banknote },
};

const CHANNEL_ICON: Record<NotificationChannel, typeof Mail> = {
  email: Mail,
  sms: Phone,
  whatsapp: MessageCircle,
};

const CHANNEL_LABEL: Record<NotificationChannel, string> = {
  email: 'Email',
  sms: 'SMS',
  whatsapp: 'WhatsApp',
};

function formatPlacedAt(epoch: number): string {
  const d = new Date(epoch);
  return d.toLocaleString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default function OrderConfirmationPage() {
  const { id } = useParams<{ id: string }>();
  const orders = useOrderStore((s) => s.orders);
  const [hydrated, setHydrated] = useState(false);
  const [notifications, setNotifications] = useState<DispatchResult[]>([]);

  useEffect(() => setHydrated(true), []);

  const order = id && hydrated ? orders[id] : undefined;

  // Fire-and-show notification dispatch once the order is in hand. Stub today
  // (queued), real providers can be wired up in src/lib/notifications.ts.
  useEffect(() => {
    if (!order) return;
    let cancelled = false;
    dispatchOrderConfirmation(order).then((results) => {
      if (!cancelled) setNotifications(results);
    });
    return () => {
      cancelled = true;
    };
  }, [order]);

  if (!hydrated) {
    return (
      <Container className="flex min-h-[60svh] items-center justify-center py-16">
        <div className="text-sm text-neutral-400">Loading order…</div>
      </Container>
    );
  }

  if (!order) {
    return (
      <Container className="flex min-h-[60svh] flex-col items-center justify-center py-16 text-center">
        <span className="text-7xl">📦</span>
        <h1 className="mt-6 text-2xl font-bold">Order not found</h1>
        <p className="mt-2 max-w-sm text-sm text-neutral-600">
          We couldn't find an order with this ID on this device. Orders are stored locally — open
          this link in the same browser you placed the order from, or check your order history.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link href="/orders">
            <Button variant="outline">
              <ListOrdered className="h-4 w-4" /> Order history
            </Button>
          </Link>
          <Link href="/products">
            <Button>Browse products</Button>
          </Link>
        </div>
      </Container>
    );
  }

  const Payment = PAYMENT_LABEL[order.paymentMethod];
  const eta =
    order.deliveryType === 'store-pickup'
      ? 'Ready in 30 minutes at our Aurangabad store'
      : 'Same-day delivery in Aurangabad';
  const itemCount = order.items.reduce((acc, i) => acc + i.qty, 0);

  const paymentStatus =
    order.paymentMethod === 'cod' ? 'Pay on delivery' : 'Authorized';

  return (
    <Container className="py-12">
      {/* Success header */}
      <div className="mx-auto max-w-2xl text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          className="relative inline-flex"
        >
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.15, 1] }}
            transition={{ delay: 0.05, duration: 0.5, times: [0, 0.65, 1] }}
            className="absolute inset-0 rounded-2xl bg-primary-200/40 blur-xl"
          />
          <span className="relative inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
            <CheckCircle2 className="h-10 w-10" strokeWidth={1.5} />
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl"
        >
          Order placed successfully
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="mt-2 text-sm text-neutral-600"
        >
          Thank you, {order.customer.fullName.split(' ')[0]}. Order{' '}
          <span className="font-mono font-semibold text-neutral-900">{order.id}</span> received{' '}
          {formatPlacedAt(order.placedAt)}.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full bg-primary-100 px-4 py-2 text-sm font-semibold text-primary-800"
        >
          <Clock3 className="h-4 w-4" /> {eta}
        </motion.div>

        {order.requiresPrescription && (
          <div className="mx-auto mt-5 inline-flex max-w-md items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-left text-xs text-rose-900">
            <Stethoscope className="mt-0.5 h-4 w-4 flex-shrink-0 text-rose-700" />
            <p>
              Your order includes prescription items. If you haven't already, please{' '}
              <Link href="/prescription" className="font-semibold underline">
                upload your prescription
              </Link>{' '}
              so we can dispatch promptly.
            </p>
          </div>
        )}
      </div>

      <div className="mx-auto mt-10 grid max-w-4xl gap-6 lg:grid-cols-[1fr_18rem]">
        {/* Items */}
        <section className="rounded-2xl border border-neutral-200/70 bg-white p-6 shadow-card">
          <div className="flex items-end justify-between">
            <h2 className="text-lg font-semibold">Items in this order</h2>
            <span className="text-xs text-neutral-500">
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </span>
          </div>

          <ul className="mt-5 space-y-4">
            {order.items.map(({ product, qty }) => (
              <li
                key={product.id}
                className="flex gap-4 border-b border-neutral-100 pb-4 last:border-0 last:pb-0"
              >
                <Tile emoji={product.emoji} tint={product.tile} size="md" className="flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-neutral-900">{product.brand}</p>
                  <p className="text-xs text-neutral-700">{product.name}</p>
                  <p className="mt-0.5 text-xs text-neutral-500">{product.pack}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge tone={product.rxRequired ? 'rx' : 'otc'}>
                      {product.rxRequired ? 'Rx' : 'OTC'}
                    </Badge>
                    <span className="text-xs text-neutral-500">Qty {qty}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold tabular-nums">
                    {formatPrice(product.price * qty)}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <dl className="mt-6 space-y-2 border-t border-neutral-200 pt-4 text-sm">
            <Row label="Subtotal" value={formatPrice(order.subtotal)} />
            {order.mrpTotal > order.subtotal && (
              <Row
                label="You saved"
                value={`−${formatPrice(order.mrpTotal - order.subtotal)}`}
                tone="success"
              />
            )}
            <Row
              label="Delivery"
              value={order.deliveryFee === 0 ? 'Free' : formatPrice(order.deliveryFee)}
              tone={order.deliveryFee === 0 ? 'success' : undefined}
            />
            <div className="flex items-baseline justify-between border-t border-neutral-200 pt-3">
              <dt className="text-sm font-semibold">Total paid</dt>
              <dd className="text-2xl font-bold tabular-nums">{formatPrice(order.total)}</dd>
            </div>
          </dl>
        </section>

        {/* Sidebar */}
        <aside className="space-y-4">
          <Card title="Order ID">
            <p className="font-mono text-base font-semibold text-neutral-900">{order.id}</p>
            <p className="mt-1 text-xs text-neutral-500">{formatPlacedAt(order.placedAt)}</p>
          </Card>

          <Card title="Payment">
            <p className="inline-flex items-center gap-2 text-sm font-semibold">
              <Payment.icon className="h-4 w-4 text-primary-600" /> {Payment.label}
            </p>
            <p className="mt-1 inline-flex items-center gap-1 text-xs">
              <ShieldCheck className="h-3 w-3 text-primary-600" />
              <span className="font-semibold text-primary-700">{paymentStatus}</span>
            </p>
          </Card>

          <Card title="Delivery">
            <p className="inline-flex items-center gap-2 text-sm font-semibold">
              {order.deliveryType === 'store-pickup' ? (
                <>
                  <Store className="h-4 w-4 text-primary-600" /> Store Pickup
                </>
              ) : (
                <>
                  <Truck className="h-4 w-4 text-primary-600" /> Home Delivery
                </>
              )}
            </p>
            <p className="mt-2 text-xs text-neutral-700 leading-relaxed">
              {order.customer.fullName}
              <br />
              {order.customer.addressLine}
              {order.customer.landmark ? `, ${order.customer.landmark}` : ''}
              <br />
              {order.customer.city} – {order.customer.pincode}
              <br />
              <span className="text-neutral-500">+91 {order.customer.phone}</span>
            </p>
          </Card>

          <Card title="Confirmation sent">
            {notifications.length === 0 ? (
              <p className="text-xs text-neutral-500">Queueing notifications…</p>
            ) : (
              <ul className="space-y-1.5 text-xs">
                {notifications.map((n) => {
                  const Icon = CHANNEL_ICON[n.channel];
                  return (
                    <li key={n.channel} className="flex items-center gap-2 text-neutral-700">
                      <Icon className="h-3.5 w-3.5 text-primary-600" />
                      <span className="font-semibold">{CHANNEL_LABEL[n.channel]}</span>
                      <span className="text-neutral-500">·</span>
                      <span className="font-mono">{n.target}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <div className="flex flex-col gap-2">
            <Link href={`/order/${order.id}/print`} target="_blank" rel="noreferrer">
              <Button variant="outline" size="lg" className="w-full">
                <Download className="h-4 w-4" /> Download invoice
              </Button>
            </Link>
            <Link href="/orders">
              <Button variant="outline" size="lg" className="w-full">
                <ListOrdered className="h-4 w-4" /> Order history
              </Button>
            </Link>
            <Link href="/products">
              <Button variant="primary" size="lg" className="w-full">
                <Package className="h-4 w-4" /> Continue shopping
              </Button>
            </Link>
            <Link href="/">
              <Button variant="ghost" size="lg" className="w-full">
                <Home className="h-4 w-4" /> Back to home
              </Button>
            </Link>
          </div>
        </aside>
      </div>
    </Container>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-neutral-200/70 bg-white p-5 shadow-card">
      <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">{title}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'success' | 'danger';
}) {
  return (
    <div
      className={
        'flex justify-between ' +
        (tone === 'success' ? 'text-success' : tone === 'danger' ? 'text-danger' : 'text-neutral-700')
      }
    >
      <dt>{label}</dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
