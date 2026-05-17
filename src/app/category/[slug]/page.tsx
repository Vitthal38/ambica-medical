'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import { ProductGrid } from '@/features/products/ProductGrid';
import { useProductList } from '@/features/products/api';
import { useCategories } from '@/features/categories/api';
import type { CategorySlug } from '@/features/products/types';
import { USER_CATEGORY_SLUGS } from '@/lib/taxonomy';

const VALID = USER_CATEGORY_SLUGS;

const PAGE_SIZE = 48;

export default function CategoryPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params.slug;

  useEffect(() => {
    if (slug && !VALID.includes(slug as CategorySlug)) {
      router.replace('/products');
    }
  }, [slug, router]);

  if (!slug || !VALID.includes(slug as CategorySlug)) {
    return null;
  }

  return <CategoryContent slug={slug as CategorySlug} />;
}

function CategoryContent({ slug }: { slug: CategorySlug }) {
  const { data: products, isLoading } = useProductList({ category: slug });
  const { data: categories } = useCategories();
  const [visible, setVisible] = useState(PAGE_SIZE);

  // Reset pagination when navigating between categories
  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [slug]);

  const category = categories?.find((c) => c.slug === slug);
  const all = products ?? [];
  const visibleProducts = all.slice(0, visible);
  const hasMore = visible < all.length;

  return (
    <>
      <section className="border-b border-neutral-200 bg-gradient-to-br from-primary-50 via-white to-accent-50">
        <Container className="py-10">
          <Link
            href="/products"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary-700 hover:text-primary-800"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> All products
          </Link>
          <div className="mt-3 flex items-center gap-4">
            <span
              aria-hidden
              className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-4xl shadow-card"
            >
              {category?.emoji ?? '📦'}
            </span>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{category?.name ?? 'Category'}</h1>
              <p className="mt-1 text-sm text-neutral-600">
                {isLoading ? 'Loading…' : `${all.length} products available`}
              </p>
            </div>
          </div>
        </Container>
      </section>

      <Container className="py-10">
        <ProductGrid
          products={visibleProducts}
          isLoading={isLoading}
          empty={`No ${category?.name.toLowerCase() ?? 'products'} in stock right now.`}
        />

        {hasMore && (
          <div className="mt-10 flex flex-col items-center gap-2">
            <p className="text-xs text-neutral-500">
              Showing {visibleProducts.length} of {all.length}
            </p>
            <Button variant="outline" size="lg" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
              Load more
            </Button>
          </div>
        )}
      </Container>
    </>
  );
}
