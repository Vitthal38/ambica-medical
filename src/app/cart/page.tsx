'use client';

import Link from 'next/link';
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Truck,
  BadgeCheck,
  ArrowRight,
} from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tile } from '@/components/ui/Tile';
import {
  selectCartCount,
  selectMrpTotal,
  selectSubtotal,
  useCartStore,
} from '@/features/cart/cartStore';
import { formatPrice } from '@/lib/formatPrice';

const FREE_DELIVERY_THRESHOLD = 500;

export default function CartPage() {
  const items = useCartStore((s) => s.items);
  const setQty = useCartStore((s) => s.setQty);
  const removeItem = useCartStore((s) => s.removeItem);
  const clear = useCartStore((s) => s.clear);
  const count = useCartStore(selectCartCount);
  const subtotal = useCartStore(selectSubtotal);
  const mrpTotal = useCartStore(selectMrpTotal);

  const discount = mrpTotal - subtotal;
  const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD || subtotal === 0 ? 0 : 49;
  const grandTotal = subtotal + deliveryFee;
  const amountToFreeDelivery = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal);

  if (count === 0) {
    return (
      <Container className="flex min-h-[60svh] flex-col items-center justify-center py-16 text-center">
        <span className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-50 text-primary-700">
          <ShoppingBag className="h-9 w-9" strokeWidth={1.75} />
        </span>
        <h1 className="mt-6 text-2xl font-bold">Your cart is empty</h1>
        <p className="mt-2 max-w-sm text-sm text-neutral-600">
          Add medicines or wellness products from our catalog to get started.
        </p>
        <Link href="/products" className="mt-5">
          <Button>Browse products</Button>
        </Link>
      </Container>
    );
  }

  return (
    <Container className="py-10">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your cart</h1>
          <p className="mt-1 text-sm text-neutral-600">
            {count} {count === 1 ? 'item' : 'items'} ready for checkout
          </p>
        </div>
        <button
          type="button"
          onClick={clear}
          className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-500 hover:text-danger"
        >
          <Trash2 className="h-3.5 w-3.5" /> Clear cart
        </button>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-3">
          {items.map(({ product, qty }) => (
            <article
              key={product.id}
              className="flex gap-4 rounded-2xl border border-neutral-200/70 bg-white p-4 shadow-card"
            >
              <Tile emoji={product.emoji} tint={product.tile} size="md" className="flex-shrink-0" />
              <div className="flex flex-1 flex-col">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <Link
                      href={`/products/${product.id}`}
                      className="text-base font-semibold text-neutral-900 hover:text-primary-700"
                    >
                      {product.brand} · {product.name}
                    </Link>
                    <p className="mt-0.5 text-xs text-neutral-500">{product.pack}</p>
                  </div>
                  <Badge tone={product.rxRequired ? 'rx' : 'otc'}>
                    {product.rxRequired ? 'Rx' : 'OTC'}
                  </Badge>
                </div>

                <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-3">
                  <div className="inline-flex items-center rounded-lg border border-neutral-200 bg-white">
                    <button
                      type="button"
                      onClick={() => setQty(product.id, qty - 1)}
                      className="inline-flex h-9 w-9 items-center justify-center text-neutral-700 hover:text-primary-700"
                      aria-label={`Decrease ${product.name}`}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-8 text-center text-sm font-semibold tabular-nums">{qty}</span>
                    <button
                      type="button"
                      onClick={() => setQty(product.id, qty + 1)}
                      className="inline-flex h-9 w-9 items-center justify-center text-neutral-700 hover:text-primary-700"
                      aria-label={`Increase ${product.name}`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="text-right">
                    <div className="text-base font-bold">{formatPrice(product.price * qty)}</div>
                    {product.mrp > product.price && (
                      <div className="text-xs text-neutral-400 line-through">
                        {formatPrice(product.mrp * qty)}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItem(product.id)}
                    className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-danger"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        <aside className="h-fit rounded-2xl border border-neutral-200/70 bg-white p-6 shadow-card lg:sticky lg:top-24">
          <h2 className="text-lg font-semibold">Order summary</h2>

          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between text-neutral-700">
              <dt>Subtotal ({count} items)</dt>
              <dd className="font-semibold">{formatPrice(subtotal)}</dd>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-success">
                <dt>You save</dt>
                <dd className="font-semibold">−{formatPrice(discount)}</dd>
              </div>
            )}
            <div className="flex justify-between text-neutral-700">
              <dt>Delivery</dt>
              <dd className="font-semibold">
                {deliveryFee === 0 ? (
                  <span className="text-success">Free</span>
                ) : (
                  formatPrice(deliveryFee)
                )}
              </dd>
            </div>
            {amountToFreeDelivery > 0 && (
              <div className="rounded-lg bg-primary-50 px-3 py-2 text-xs text-primary-800">
                Add <span className="font-bold">{formatPrice(amountToFreeDelivery)}</span> more for
                free delivery.
              </div>
            )}
            <div className="border-t border-neutral-200 pt-3" />
            <div className="flex items-baseline justify-between">
              <dt className="text-sm font-semibold">Total</dt>
              <dd className="text-2xl font-bold">{formatPrice(grandTotal)}</dd>
            </div>
          </dl>

          <Link href="/checkout" className="mt-5 block">
            <Button size="lg" className="w-full">
              Proceed to Checkout <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>

          <ul className="mt-5 space-y-2 text-xs text-neutral-600">
            <li className="flex items-center gap-2">
              <Truck className="h-3.5 w-3.5 text-primary-600" /> Same-day delivery in Aurangabad
            </li>
            <li className="flex items-center gap-2">
              <BadgeCheck className="h-3.5 w-3.5 text-primary-600" /> 100% genuine, pharmacist-verified
            </li>
          </ul>
        </aside>
      </div>
    </Container>
  );
}
