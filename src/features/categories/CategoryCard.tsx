import Link from 'next/link';
import type { Category } from './types';
import { Tile } from '@/components/ui/Tile';

interface Props {
  category: Category;
}

export function CategoryCard({ category }: Props) {
  return (
    <Link
      href={`/category/${category.slug}`}
      className="group flex h-full flex-col items-center gap-3 rounded-2xl border border-neutral-200/70 bg-white p-5 text-center shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-cardHover hover:border-primary-300"
    >
      <Tile emoji={category.emoji} tint={category.tile} size="md" />
      <div className="flex-1">
        <h3 className="text-sm font-semibold leading-tight text-neutral-900">
          {category.name}
        </h3>
        <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-neutral-500">
          {category.tagline}
        </p>
      </div>
      <p className="text-xs font-semibold text-primary-700">
        {category.productCount.toLocaleString('en-IN')}{' '}
        <span className="font-normal text-neutral-500">items</span>
      </p>
    </Link>
  );
}
