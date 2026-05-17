'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { ProductGrid } from './ProductGrid';
import { useAllProducts } from './api';

const HOME_LIMIT = 12;

/**
 * "More Products" — a teaser slice from the catalog. Caps at 12 cards on the
 * homepage so a 500-row catalog doesn't tank the landing page render. The
 * "Browse all" CTA at the bottom takes users to /products.
 */
export function MoreProducts() {
  const { data, isLoading } = useAllProducts();
  const all = data ?? [];
  // Skip the first 6 (those live in Featured) and cap at HOME_LIMIT.
  const more = all.slice(6, 6 + HOME_LIMIT);

  return (
    <section className="border-t border-neutral-100 bg-neutral-50/50 py-14">
      <Container>
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
              More Products
            </h2>
            <p className="mt-1 text-sm text-neutral-600">Trusted brands at the best prices</p>
          </div>
          <Link
            href="/products"
            className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-primary-700 hover:text-primary-800 sm:inline-flex"
          >
            Browse all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-8">
          <ProductGrid products={more} isLoading={isLoading} skeletonCount={8} />
        </div>

        <div className="mt-8 text-center sm:hidden">
          <Link
            href="/products"
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary-700 hover:text-primary-800"
          >
            Browse all {all.length > 0 && `${all.length}+ products`}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Container>
    </section>
  );
}
