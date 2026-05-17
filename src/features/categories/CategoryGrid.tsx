'use client';

import Link from 'next/link';
import { ArrowRight, ShoppingBag } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { Skeleton } from '@/components/ui/Skeleton';
import { CategoryCard } from './CategoryCard';
import { useCategories } from './api';

export function CategoryGrid() {
  const { data, isLoading } = useCategories();

  return (
    <section className="py-14">
      <Container>
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
              Shop by Category
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              Browse by what you need — fever, allergy, diabetes, more
            </p>
          </div>
          <Link
            href="/products"
            className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-primary-700 hover:text-primary-800 sm:inline-flex"
          >
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-8 grid auto-rows-fr grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5">
          {isLoading
            ? Array.from({ length: 16 }).map((_, i) => (
                <Skeleton key={i} className="h-44 rounded-2xl" />
              ))
            : data?.map((c) => <CategoryCard key={c.slug} category={c} />)}

          {/* "Shop All" tile that closes the grid */}
          <Link
            href="/products"
            className="group flex h-full flex-col items-center justify-center gap-3 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 p-5 text-center text-white shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-cardHover"
          >
            <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15">
              <ShoppingBag className="h-7 w-7" strokeWidth={1.75} />
            </span>
            <div>
              <h3 className="text-sm font-semibold">Shop All</h3>
              <p className="mt-0.5 inline-flex items-center gap-1 text-xs opacity-90">
                Browse everything{' '}
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </p>
            </div>
          </Link>
        </div>
      </Container>
    </section>
  );
}
