import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Container } from '@/components/layout/Container';
import { Skeleton } from '@/components/ui/Skeleton';
import { ProductsView } from './products-view';

export const metadata: Metadata = {
  title: 'All Products',
  description: 'Browse the full Ambica Medical catalog — medicines, vitamins, devices, and more.',
};

function ProductsFallback() {
  return (
    <Container className="py-10">
      <Skeleton className="h-9 w-48" />
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-64 rounded-2xl" />
        ))}
      </div>
    </Container>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<ProductsFallback />}>
      <ProductsView />
    </Suspense>
  );
}
