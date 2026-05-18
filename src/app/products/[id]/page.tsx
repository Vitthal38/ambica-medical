'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Plus, Minus, Truck, ShieldCheck, Stethoscope } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { ProductGrid } from '@/features/products/ProductGrid';
import { ProductImage } from '@/features/products/ProductImage';
import { useAllProducts, useProduct } from '@/features/products/api';
import { useCartStore } from '@/features/cart/cartStore';
import { discountPct, formatPrice } from '@/lib/formatPrice';

const ACRONYMS = new Set([
  'tb', 'ibs', 'ibd', 'gerd', 'dvt', 'copd', 'ldl', 'uti', 'adhd', 'pms',
  'pah', 'hiv',
]);

/** Convert a condition slug like "high-blood-pressure" to "High Blood Pressure". */
function humanizeCondition(slug: string): string {
  return slug
    .split('-')
    .map((w) =>
      ACRONYMS.has(w) ? w.toUpperCase() : w[0]?.toUpperCase() + w.slice(1),
    )
    .join(' ');
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: product, isLoading } = useProduct(id);
  const { data: all } = useAllProducts();
  const addItem = useCartStore((s) => s.addItem);
  const router = useRouter();
  const [qty, setQty] = useState(1);

  if (isLoading) {
    return (
      <Container className="py-10">
        <div className="grid gap-8 lg:grid-cols-2">
          <Skeleton className="h-80 rounded-2xl" />
          <div className="space-y-3">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-9 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-12 w-1/3" />
          </div>
        </div>
      </Container>
    );
  }

  if (!product) {
    return (
      <Container className="py-16 text-center">
        <h1 className="text-2xl font-bold">Product not found</h1>
        <Link href="/products" className="mt-3 inline-block text-primary-700 hover:underline">
          Back to all products
        </Link>
      </Container>
    );
  }

  const pct = discountPct(product.price, product.mrp);
  const related = (all ?? [])
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  const handleAddToCart = () => {
    if (!product.inStock) return;
    addItem(product, qty);
    router.push('/cart');
  };

  return (
    <>
      <Container className="py-8">
        <Link
          href="/products"
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary-700 hover:text-primary-800"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> All products
        </Link>

        <div className="mt-6 grid gap-10 lg:grid-cols-2">
          <div className="group overflow-hidden rounded-3xl border border-neutral-200/70 bg-white shadow-card">
            <ProductImage
              product={product}
              className="aspect-square"
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
            />
          </div>

          <div>
            <div className="flex flex-wrap gap-2">
              <Badge tone={product.rxRequired ? 'rx' : 'otc'}>
                {product.rxRequired ? 'Rx Required' : 'OTC'}
              </Badge>
              {pct > 0 && <Badge tone="discount">−{pct}% OFF</Badge>}
              {!product.inStock && <Badge tone="danger">Out of stock</Badge>}
            </div>

            <p className="mt-4 text-sm font-medium uppercase tracking-widest text-neutral-500">
              {product.brand}
              {product.manufacturer && product.manufacturer !== product.brand && (
                <span className="ml-2 text-neutral-400 normal-case">
                  · by {product.manufacturer}
                </span>
              )}
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
              {product.name}
            </h1>
            <p className="mt-2 text-sm text-neutral-600">{product.pack}</p>

            {product.internalClass && (
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-neutral-100 px-2 py-1 text-[11px] font-semibold text-neutral-600">
                {product.internalClass}
              </p>
            )}

            {product.description && (
              <p className="mt-5 max-w-md text-sm leading-relaxed text-neutral-700">
                {product.description}
              </p>
            )}

            {product.conditions && product.conditions.length > 0 && (
              <div className="mt-5 rounded-xl border border-primary-100 bg-primary-50/50 p-4">
                <p className="text-[11px] font-bold uppercase tracking-widest text-primary-700">
                  Used for
                </p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {product.conditions.slice(0, 8).map((c) => (
                    <li
                      key={c}
                      className="inline-flex items-center rounded-full bg-white px-2.5 py-1 text-xs font-medium text-primary-800 border border-primary-100"
                    >
                      {humanizeCondition(c)}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-7 flex items-baseline gap-3">
              <span className="text-4xl font-bold">{formatPrice(product.price)}</span>
              {pct > 0 && (
                <>
                  <span className="text-lg text-neutral-400 line-through">
                    {formatPrice(product.mrp)}
                  </span>
                  <span className="text-sm font-semibold text-success">
                    Save {formatPrice(product.mrp - product.price)}
                  </span>
                </>
              )}
            </div>
            <p className="mt-1 text-xs text-neutral-500">Inclusive of all taxes</p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center rounded-xl border border-neutral-200 bg-white">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  disabled={qty <= 1 || !product.inStock}
                  className="inline-flex h-11 w-11 items-center justify-center text-neutral-700 hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-8 text-center text-sm font-semibold tabular-nums">{qty}</span>
                <button
                  type="button"
                  onClick={() => setQty((q) => q + 1)}
                  disabled={!product.inStock}
                  className="inline-flex h-11 w-11 items-center justify-center text-neutral-700 hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Increase quantity"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <Button
                size="lg"
                onClick={handleAddToCart}
                disabled={!product.inStock}
                className="flex-1 sm:flex-initial"
              >
                {product.inStock ? 'Add to Cart' : 'Out of stock'}
              </Button>
            </div>

            {product.rxRequired && (
              <p className="mt-3 inline-flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800 border border-rose-100">
                <Stethoscope className="h-4 w-4" /> A valid prescription is required. Upload it at checkout or
                {' '}
                <Link href="/prescription" className="font-semibold underline">
                  upload now
                </Link>
                .
              </p>
            )}

            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="flex items-center gap-2 text-xs text-neutral-700">
                <Truck className="h-4 w-4 text-primary-600" /> Same-day delivery
              </div>
              <div className="flex items-center gap-2 text-xs text-neutral-700">
                <ShieldCheck className="h-4 w-4 text-primary-600" /> 100% genuine
              </div>
              <div className="flex items-center gap-2 text-xs text-neutral-700">
                <Stethoscope className="h-4 w-4 text-primary-600" /> Pharmacist verified
              </div>
            </div>
          </div>
        </div>
      </Container>

      {related.length > 0 && (
        <section className="mt-8 border-t border-neutral-100 bg-neutral-50/50 py-12">
          <Container>
            <h2 className="text-xl font-bold tracking-tight">Related products</h2>
            <div className="mt-6">
              <ProductGrid products={related} />
            </div>
          </Container>
        </section>
      )}
    </>
  );
}
