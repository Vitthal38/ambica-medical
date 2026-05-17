'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ChevronLeft,
  CreditCard,
  Wallet,
  Landmark,
  Banknote,
  Truck,
  Store,
  ShieldCheck,
  Stethoscope,
  Loader2,
} from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Tile } from '@/components/ui/Tile';
import { Badge } from '@/components/ui/Badge';
import {
  selectCartCount,
  selectMrpTotal,
  selectSubtotal,
  useCartStore,
} from '@/features/cart/cartStore';
import { useOrderStore } from '@/features/checkout/orderStore';
import {
  checkoutSchema,
  type CheckoutForm,
  type PaymentMethod,
  type DeliveryType,
} from '@/features/checkout/schema';
import { formatPrice } from '@/lib/formatPrice';
import { cn } from '@/lib/cn';

const FREE_DELIVERY_THRESHOLD = 500;

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string; sub: string; icon: typeof CreditCard }[] = [
  { value: 'upi', label: 'UPI', sub: 'PhonePe, GPay, Paytm', icon: Wallet },
  { value: 'card', label: 'Credit / Debit Card', sub: 'Visa, MasterCard, RuPay', icon: CreditCard },
  { value: 'netbanking', label: 'Net Banking', sub: 'All major Indian banks', icon: Landmark },
  { value: 'cod', label: 'Cash on Delivery', sub: 'Pay when your order arrives', icon: Banknote },
];

const DELIVERY_OPTIONS: { value: DeliveryType; label: string; sub: string; icon: typeof Truck }[] = [
  { value: 'home-delivery', label: 'Home Delivery', sub: 'Same-day in Aurangabad', icon: Truck },
  { value: 'store-pickup', label: 'Store Pickup', sub: 'Ready in 30 minutes', icon: Store },
];

export function CheckoutView() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const count = useCartStore(selectCartCount);
  const subtotal = useCartStore(selectSubtotal);
  const mrpTotal = useCartStore(selectMrpTotal);
  const clearCart = useCartStore((s) => s.clear);
  const addOrder = useOrderStore((s) => s.addOrder);

  // Hydration guard — persisted cart only exists after mount.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const discount = mrpTotal - subtotal;
  const requiresPrescription = items.some((i) => i.product.rxRequired);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      fullName: '',
      phone: '',
      email: '',
      addressLine: '',
      landmark: '',
      city: 'Aurangabad',
      pincode: '',
      deliveryType: 'home-delivery',
      paymentMethod: 'cod',
      notes: '',
    },
  });

  const deliveryType = watch('deliveryType');
  const paymentMethod = watch('paymentMethod');

  const deliveryFee =
    deliveryType === 'store-pickup' || subtotal >= FREE_DELIVERY_THRESHOLD || subtotal === 0
      ? 0
      : 49;
  const grandTotal = subtotal + deliveryFee;

  // After mount, if cart is empty, bounce to /products.
  useEffect(() => {
    if (hydrated && count === 0) {
      router.replace('/products');
    }
  }, [hydrated, count, router]);

  if (!hydrated) {
    return (
      <Container className="flex min-h-[60svh] items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </Container>
    );
  }

  if (count === 0) {
    return null;
  }

  const onSubmit = handleSubmit(async (data) => {
    setSubmitError(null);
    try {
      // Simulate ~700ms of "placing order".
      // Replace with a real `await fetch('/api/orders', …)` call once a public
      // order endpoint exists. Only flip to success state AFTER persistence
      // succeeds — never on frontend optimism alone.
      await new Promise((r) => setTimeout(r, 700));

      const orderId = `AMB-${Math.floor(100000 + Math.random() * 900000)}`;
      addOrder({
        id: orderId,
        placedAt: Date.now(),
        items: [...items],
        customer: data,
        subtotal,
        mrpTotal,
        deliveryFee,
        total: grandTotal,
        paymentMethod: data.paymentMethod,
        deliveryType: data.deliveryType,
        status: 'placed',
        requiresPrescription,
      });

      // Order persisted — safe to clear cart and redirect.
      clearCart();
      router.push(`/order/${orderId}`);
    } catch (err) {
      // Cart is intentionally untouched on failure so the user can retry.
      setSubmitError(
        err instanceof Error
          ? `Could not place the order: ${err.message}`
          : 'Could not place the order. Please try again in a moment.',
      );
    }
  });

  return (
    <Container className="py-10">
      <Link
        href="/cart"
        className="inline-flex items-center gap-1 text-xs font-semibold text-primary-700 hover:text-primary-800"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> Back to cart
      </Link>

      <h1 className="mt-3 text-3xl font-bold tracking-tight">Checkout</h1>
      <p className="mt-1 text-sm text-neutral-600">
        {count} {count === 1 ? 'item' : 'items'} · Confirm details to place your order
      </p>

      {requiresPrescription && (
        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          <Stethoscope className="h-5 w-5 flex-shrink-0 text-rose-700" strokeWidth={1.75} />
          <p className="flex-1">
            Your order contains <strong>prescription medicines</strong>. Please upload a valid
            prescription so our pharmacist can verify it before dispatch.
          </p>
          <Link
            href="/prescription"
            className="rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-100"
          >
            Upload prescription
          </Link>
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-8 grid gap-6 lg:grid-cols-[1fr_22rem]">
        {/* Left column — form */}
        <div className="space-y-6">
          {/* Contact */}
          <Section title="Contact">
            <Field label="Full name" error={errors.fullName?.message}>
              <Input autoComplete="name" placeholder="e.g. Anil Kulkarni" {...register('fullName')} />
            </Field>
            <Field label="Mobile (10-digit)" error={errors.phone?.message}>
              <Input
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="9876543210"
                {...register('phone')}
              />
            </Field>
            <Field label="Email (optional)" error={errors.email?.message} className="sm:col-span-2">
              <Input
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                {...register('email')}
              />
            </Field>
          </Section>

          {/* Delivery type */}
          <Section title="Delivery">
            <fieldset className="sm:col-span-2 grid gap-3 sm:grid-cols-2">
              {DELIVERY_OPTIONS.map((opt) => (
                <RadioCard
                  key={opt.value}
                  selected={deliveryType === opt.value}
                  icon={opt.icon}
                  label={opt.label}
                  sub={opt.sub}
                  inputProps={{ ...register('deliveryType'), value: opt.value }}
                />
              ))}
            </fieldset>
          </Section>

          {/* Address */}
          <Section title="Delivery address">
            <Field
              label="House no, street, area"
              error={errors.addressLine?.message}
              className="sm:col-span-2"
            >
              <Input
                autoComplete="street-address"
                placeholder="Flat 12B, Sai Heights, Mahatma Gandhi Road"
                {...register('addressLine')}
              />
            </Field>
            <Field label="Landmark (optional)" error={errors.landmark?.message}>
              <Input placeholder="Near Hegdewar Hospital" {...register('landmark')} />
            </Field>
            <Field label="City" error={errors.city?.message}>
              <Input autoComplete="address-level2" {...register('city')} />
            </Field>
            <Field label="Pincode" error={errors.pincode?.message}>
              <Input
                inputMode="numeric"
                autoComplete="postal-code"
                placeholder="431001"
                maxLength={6}
                {...register('pincode')}
              />
            </Field>
          </Section>

          {/* Payment */}
          <Section title="Payment method">
            <fieldset className="sm:col-span-2 grid gap-3 sm:grid-cols-2">
              {PAYMENT_OPTIONS.map((opt) => (
                <RadioCard
                  key={opt.value}
                  selected={paymentMethod === opt.value}
                  icon={opt.icon}
                  label={opt.label}
                  sub={opt.sub}
                  inputProps={{ ...register('paymentMethod'), value: opt.value }}
                />
              ))}
            </fieldset>
            {paymentMethod !== 'cod' && (
              <p className="sm:col-span-2 -mt-2 inline-flex items-center gap-1.5 rounded-md bg-neutral-100 px-3 py-2 text-xs text-neutral-600">
                <ShieldCheck className="h-3.5 w-3.5 text-primary-600" />
                You'll be redirected to a secure payment gateway after confirming.
              </p>
            )}
          </Section>

          {/* Notes */}
          <Section title="Order notes (optional)">
            <Field label="" error={errors.notes?.message} className="sm:col-span-2">
              <textarea
                rows={3}
                placeholder="Any specific instructions for the pharmacist or delivery agent?"
                className={cn(
                  'w-full rounded-xl bg-white px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400',
                  'border border-neutral-200 transition-colors',
                  'focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100',
                )}
                {...register('notes')}
              />
            </Field>
          </Section>

          {submitError && (
            <p
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
            >
              {submitError}{' '}
              <span className="text-xs text-rose-700">Your cart has been preserved.</span>
            </p>
          )}

          <div className="lg:hidden">
            <SubmitFooter
              isSubmitting={isSubmitting}
              total={grandTotal}
              count={count}
            />
          </div>
        </div>

        {/* Right column — order summary */}
        <aside className="lg:sticky lg:top-24 h-fit space-y-4">
          <div className="rounded-2xl border border-neutral-200/70 bg-white p-5 shadow-card">
            <h2 className="text-sm font-bold uppercase tracking-widest text-neutral-500">
              Order summary
            </h2>

            <ul className="mt-4 max-h-72 space-y-3 overflow-y-auto pr-1">
              {items.map(({ product, qty }) => (
                <li key={product.id} className="flex gap-3">
                  <Tile
                    emoji={product.emoji}
                    tint={product.tile}
                    size="sm"
                    className="flex-shrink-0"
                  />
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate text-sm font-semibold">
                      {product.brand} · {product.name}
                    </p>
                    <p className="truncate text-xs text-neutral-500">{product.pack}</p>
                    <p className="mt-0.5 text-xs text-neutral-500">Qty {qty}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold tabular-nums">
                      {formatPrice(product.price * qty)}
                    </p>
                    {product.rxRequired && (
                      <Badge tone="rx" className="mt-1">
                        Rx
                      </Badge>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            <dl className="mt-5 space-y-2 border-t border-neutral-200 pt-4 text-sm">
              <div className="flex justify-between text-neutral-700">
                <dt>Subtotal</dt>
                <dd className="font-semibold tabular-nums">{formatPrice(subtotal)}</dd>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-success">
                  <dt>You save</dt>
                  <dd className="font-semibold tabular-nums">−{formatPrice(discount)}</dd>
                </div>
              )}
              <div className="flex justify-between text-neutral-700">
                <dt>Delivery</dt>
                <dd className="font-semibold tabular-nums">
                  {deliveryFee === 0 ? <span className="text-success">Free</span> : formatPrice(deliveryFee)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between border-t border-neutral-200 pt-3">
                <dt className="text-sm font-semibold">Total</dt>
                <dd className="text-2xl font-bold tabular-nums">{formatPrice(grandTotal)}</dd>
              </div>
            </dl>

            <div className="hidden lg:block">
              <SubmitFooter isSubmitting={isSubmitting} total={grandTotal} count={count} />
            </div>
          </div>

          <p className="px-1 text-[11px] leading-relaxed text-neutral-500">
            By placing this order you agree to our terms. Licensed under the Maharashtra Pharmacy
            Act · Lic. No: MH-AUR-00001.
          </p>
        </aside>
      </form>
    </Container>
  );
}

/* -------------------------------------------------------------------------- */
/* Local helpers                                                              */
/* -------------------------------------------------------------------------- */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-neutral-200/70 bg-white p-5 shadow-card sm:p-6">
      <h2 className="text-sm font-bold uppercase tracking-widest text-neutral-500">{title}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({
  label,
  error,
  children,
  className,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <span className="text-xs font-semibold uppercase tracking-widest text-neutral-600">
          {label}
        </span>
      )}
      {children}
      {error && <span className="text-xs text-rose-700">{error}</span>}
    </label>
  );
}

function RadioCard({
  selected,
  icon: Icon,
  label,
  sub,
  inputProps,
}: {
  selected: boolean;
  icon: typeof CreditCard;
  label: string;
  sub: string;
  inputProps: React.InputHTMLAttributes<HTMLInputElement>;
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-xl border-2 bg-white p-4 transition-colors',
        selected
          ? 'border-primary-500 bg-primary-50/40 shadow-card'
          : 'border-neutral-200 hover:border-primary-300',
      )}
    >
      <input type="radio" {...inputProps} className="sr-only" />
      <span
        className={cn(
          'inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg',
          selected ? 'bg-primary-600 text-white' : 'bg-neutral-100 text-neutral-600',
        )}
      >
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </span>
      <span className="flex-1 leading-tight">
        <span className="block text-sm font-semibold text-neutral-900">{label}</span>
        <span className="mt-0.5 block text-xs text-neutral-500">{sub}</span>
      </span>
    </label>
  );
}

function SubmitFooter({
  isSubmitting,
  total,
  count,
}: {
  isSubmitting: boolean;
  total: number;
  count: number;
}) {
  return (
    <div className="mt-5 space-y-2">
      <Button type="submit" size="lg" disabled={isSubmitting} className="w-full">
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Placing order…
          </>
        ) : (
          <>Place order · {formatPrice(total)}</>
        )}
      </Button>
      <p className="text-center text-[11px] text-neutral-500">
        {count} {count === 1 ? 'item' : 'items'} · Secure checkout
      </p>
    </div>
  );
}
