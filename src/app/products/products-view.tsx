'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ProductGrid } from '@/features/products/ProductGrid';
import { useAllProducts, applyFilters } from '@/features/products/api';
import { useCategories } from '@/features/categories/api';
import type { CategorySlug } from '@/features/products/types';
import { cn } from '@/lib/cn';

const PAGE_SIZE = 48;

export function ProductsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get('q') ?? '';
  const initialCat = (searchParams.get('category') as CategorySlug | null) ?? null;

  const [q, setQ] = useState(initialQ);
  const [activeCategory, setActiveCategory] = useState<CategorySlug | null>(initialCat);
  const [visible, setVisible] = useState(PAGE_SIZE);

  const { data: products, isLoading } = useAllProducts();
  const { data: categories } = useCategories();

  const filtered = useMemo(
    () => applyFilters(products ?? [], { q, category: activeCategory ?? undefined }),
    [products, q, activeCategory],
  );

  // Reset pagination whenever filters change.
  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [q, activeCategory]);

  const visibleProducts = filtered.slice(0, visible);
  const hasMore = visible < filtered.length;

  const updateUrl = (next: { q?: string; cat?: CategorySlug | null }) => {
    const sp = new URLSearchParams(searchParams.toString());
    if ('q' in next) {
      next.q ? sp.set('q', next.q) : sp.delete('q');
    }
    if ('cat' in next) {
      next.cat ? sp.set('category', next.cat) : sp.delete('category');
    }
    const qs = sp.toString();
    router.replace(qs ? `/products?${qs}` : '/products', { scroll: false });
  };

  return (
    <>
      <section className="border-b border-neutral-200 bg-white">
        <Container className="py-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">All Products</h1>
              <p className="mt-1 text-sm text-neutral-600">
                {isLoading ? 'Loading…' : `${filtered.length} of ${products?.length ?? 0} products`}
              </p>
            </div>

            <form
              role="search"
              onSubmit={(e) => {
                e.preventDefault();
                updateUrl({ q });
              }}
              className="relative w-full max-w-md"
            >
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                strokeWidth={2}
              />
              <Input
                type="search"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  updateUrl({ q: e.target.value });
                }}
                placeholder="Search products…"
                className="pl-10 pr-10"
                aria-label="Search products"
              />
              {q && (
                <button
                  type="button"
                  onClick={() => {
                    setQ('');
                    updateUrl({ q: '' });
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-neutral-400 hover:text-neutral-700"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </form>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveCategory(null);
                updateUrl({ cat: null });
              }}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                activeCategory === null
                  ? 'bg-primary-600 text-white shadow-card'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200',
              )}
            >
              All
            </button>
            {categories
              ?.slice()
              .sort((a, b) => b.productCount - a.productCount)
              .map((c) => (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => {
                    const next = activeCategory === c.slug ? null : c.slug;
                    setActiveCategory(next);
                    updateUrl({ cat: next });
                  }}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                    activeCategory === c.slug
                      ? 'bg-primary-600 text-white shadow-card'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200',
                  )}
                >
                  <span className="mr-1" aria-hidden>
                    {c.emoji}
                  </span>
                  {c.shortName}
                  <span
                    className={cn(
                      'ml-1.5 text-[10px]',
                      activeCategory === c.slug ? 'text-primary-100' : 'text-neutral-500',
                    )}
                  >
                    {c.productCount}
                  </span>
                </button>
              ))}
          </div>
        </Container>
      </section>

      <Container className="py-10">
        <ProductGrid
          products={visibleProducts}
          isLoading={isLoading}
          empty={
            q || activeCategory ? (
              <>
                No products match your filters.{' '}
                <button
                  type="button"
                  onClick={() => {
                    setQ('');
                    setActiveCategory(null);
                    updateUrl({ q: '', cat: null });
                  }}
                  className="font-semibold text-primary-700 hover:underline"
                >
                  Clear all
                </button>
              </>
            ) : (
              'No products available right now.'
            )
          }
        />

        {hasMore && (
          <div className="mt-10 flex flex-col items-center gap-2">
            <p className="text-xs text-neutral-500">
              Showing {visibleProducts.length} of {filtered.length}
            </p>
            <Button
              variant="outline"
              size="lg"
              onClick={() => setVisible((v) => v + PAGE_SIZE)}
            >
              Load more
            </Button>
          </div>
        )}
      </Container>
    </>
  );
}
