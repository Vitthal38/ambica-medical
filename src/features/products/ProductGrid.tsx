import type { Product } from './types';
import { ProductCard } from './ProductCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';

interface Props {
  products?: Product[];
  isLoading?: boolean;
  skeletonCount?: number;
  empty?: React.ReactNode;
  className?: string;
}

export function ProductGrid({
  products,
  isLoading,
  skeletonCount = 6,
  empty,
  className,
}: Props) {
  const gridCls = cn(
    'grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
    className,
  );

  if (isLoading) {
    return (
      <div className={gridCls}>
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl bg-white shadow-card">
            <Skeleton className="h-32 w-full rounded-none" />
            <div className="space-y-2 p-4">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-5 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-10 text-center text-sm text-neutral-500">
        {empty ?? 'No products to show.'}
      </div>
    );
  }

  return (
    <div className={gridCls}>
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
