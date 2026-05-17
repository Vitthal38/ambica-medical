'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { ProductGrid } from './ProductGrid';
import { useAllProducts } from './api';

/**
 * "Featured Products" — top 6 in-stock items shown on the landing page.
 * Picks the first 6 in-stock products from the catalog (mock data is already curated).
 */
export function FeaturedProducts() {
  const { data, isLoading } = useAllProducts();
  const featured = (data ?? []).filter((p) => p.inStock).slice(0, 6);

  return (
    <section className="py-14">
      <Container>
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
              Featured Products
            </h2>
            <p className="mt-1 text-sm text-neutral-600">Top picks from our pharmacy</p>
          </div>
          <Link
            href="/products"
            className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-primary-700 hover:text-primary-800 sm:inline-flex"
          >
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-8">
          <ProductGrid products={featured} isLoading={isLoading} skeletonCount={6} />
        </div>
      </Container>
    </section>
  );
}
