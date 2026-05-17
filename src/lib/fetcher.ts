import productsJson from '@/data/products.json';
import medicinesJson from '@/data/medicines.json';
import type { Product } from '@/features/products/types';
import type { Category } from '@/features/categories/types';
import { USER_CATEGORIES } from '@/lib/taxonomy';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Combine the curated 22 products (Crocin, Omron BP, etc.) with the 500-row
 * imported medicines dataset.
 */
const ALL_PRODUCTS: Product[] = [
  ...(productsJson as Product[]),
  ...(medicinesJson as Product[]),
];

/**
 * Mock fetch — reads from local JSON with simulated latency.
 * Swap the body for a real `fetch()` call when the backend is ready.
 */
export async function fetchProducts(): Promise<Product[]> {
  await sleep(200);
  return ALL_PRODUCTS;
}

export async function fetchProductById(id: string): Promise<Product | undefined> {
  await sleep(150);
  return ALL_PRODUCTS.find((p) => p.id === id);
}

/**
 * Categories are derived from the taxonomy module + live product counts.
 * No standalone categories.json — the taxonomy is the single source of truth.
 */
export async function fetchCategories(): Promise<Category[]> {
  await sleep(80);

  const catCount = new Map<string, number>();
  const subcatCount = new Map<string, number>();

  for (const p of ALL_PRODUCTS) {
    catCount.set(p.category, (catCount.get(p.category) ?? 0) + 1);
    if (p.subcategory) {
      const key = `${p.category}::${p.subcategory}`;
      subcatCount.set(key, (subcatCount.get(key) ?? 0) + 1);
    }
  }

  return USER_CATEGORIES.map((c) => ({
    slug: c.slug,
    name: c.name,
    shortName: c.shortName,
    emoji: c.emoji,
    tagline: c.tagline,
    tile: c.tile,
    productCount: catCount.get(c.slug) ?? 0,
    subcategories: c.subcategories.map((sc) => ({
      slug: sc.slug,
      name: sc.name,
      productCount: subcatCount.get(`${c.slug}::${sc.slug}`) ?? 0,
    })),
  }));
}
