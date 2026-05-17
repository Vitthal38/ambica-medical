'use client';

import Link from 'next/link';
import { Plus, Check } from 'lucide-react';
import { useState } from 'react';
import type { Product } from './types';
import { ProductImage } from './ProductImage';
import { Badge } from '@/components/ui/Badge';
import { useCartStore } from '@/features/cart/cartStore';
import { formatPrice, discountPct } from '@/lib/formatPrice';
import { cn } from '@/lib/cn';

interface Props {
  product: Product;
  className?: string;
}

export function ProductCard({ product, className }: Props) {
  const addItem = useCartStore((s) => s.addItem);
  const [justAdded, setJustAdded] = useState(false);

  const pct = discountPct(product.price, product.mrp);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!product.inStock) return;
    addItem(product);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
  };

  return (
    <article
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border border-neutral-200/70 bg-white shadow-card transition-all duration-200',
        'hover:-translate-y-0.5 hover:shadow-cardHover hover:border-neutral-300',
        className,
      )}
    >
      <Link href={`/products/${product.id}`} className="block flex-1">
        {/* Product image — falls back to emoji tile when no imageUrl or 404 */}
        <div className="relative h-36 overflow-hidden rounded-t-2xl">
          <ProductImage
            product={product}
            className="h-full"
            tileSize="lg"
            emojiClassName="text-6xl"
          />
          <div className="absolute left-3 top-3 flex flex-col gap-1.5">
            <Badge tone={product.rxRequired ? 'rx' : 'otc'}>
              {product.rxRequired ? 'Rx' : 'OTC'}
            </Badge>
          </div>
          {pct > 0 && (
            <div className="absolute right-3 top-3">
              <Badge tone="discount">−{pct}%</Badge>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex flex-col p-4">
          <h3 className="text-base font-semibold text-neutral-900 leading-tight">
            {product.brand}
          </h3>
          <p className="mt-0.5 line-clamp-1 text-sm text-neutral-700">{product.name}</p>
          <p className="mt-1 line-clamp-1 text-xs text-neutral-500">{product.pack}</p>

          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-lg font-bold text-neutral-900">{formatPrice(product.price)}</span>
            {pct > 0 && (
              <span className="text-sm text-neutral-400 line-through">{formatPrice(product.mrp)}</span>
            )}
          </div>

          <div className="mt-2 flex items-center gap-1.5 text-xs">
            <span
              className={cn(
                'inline-block h-1.5 w-1.5 rounded-full',
                product.inStock ? 'bg-success' : 'bg-danger',
              )}
            />
            <span className={cn(product.inStock ? 'text-primary-700' : 'text-danger')}>
              {product.inStock ? 'In stock' : 'Out of stock'}
            </span>
          </div>
        </div>
      </Link>

      {/* Add button — absolute over the Link. z-10 + pointer-events guarantee
          the click lands here and not on the Link underneath. */}
      <button
        type="button"
        onClick={handleAdd}
        onPointerDown={(e) => e.stopPropagation()}
        disabled={!product.inStock}
        aria-label={`Add ${product.brand} ${product.name} to cart`}
        className={cn(
          'absolute bottom-4 right-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-card transition-all',
          product.inStock
            ? 'bg-primary-600 hover:bg-primary-700 active:scale-95'
            : 'cursor-not-allowed bg-neutral-300',
        )}
      >
        {justAdded ? (
          <Check className="h-5 w-5" strokeWidth={2.5} />
        ) : (
          <Plus className="h-5 w-5" strokeWidth={2.5} />
        )}
      </button>
    </article>
  );
}
