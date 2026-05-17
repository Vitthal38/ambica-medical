import type { CategorySlug, TileTint } from '@/features/products/types';

export interface CategorySubcategory {
  slug: string;
  name: string;
  /** Live count of products in this subcategory (computed at fetch time) */
  productCount?: number;
}

export interface Category {
  slug: CategorySlug;
  name: string;
  /** Compact label for chips and mobile nav (≤ 16 chars) */
  shortName: string;
  emoji: string;
  /** One-line description shown on category cards */
  tagline: string;
  tile: TileTint;
  /** Live product count, computed by the fetcher from the catalog */
  productCount: number;
  subcategories: CategorySubcategory[];
}
