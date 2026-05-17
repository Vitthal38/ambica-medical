import { useQuery } from '@tanstack/react-query';
import { fetchProducts, fetchProductById } from '@/lib/fetcher';
import { productKeys } from './queryKeys';
import type { CategorySlug, Product } from './types';
import { normaliseSearch } from '@/lib/taxonomy';

export function useAllProducts() {
  return useQuery({
    queryKey: productKeys.all,
    queryFn: fetchProducts,
  });
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: productKeys.byId(id ?? ''),
    queryFn: () => fetchProductById(id!),
    enabled: !!id,
  });
}

interface ListFilters {
  category?: CategorySlug;
  subcategory?: string;
  q?: string;
}

export function useProductList(filters: ListFilters = {}) {
  const all = useAllProducts();
  const data = applyFilters(all.data ?? [], filters);
  return { ...all, data };
}

/**
 * Filter products against:
 *   • category / subcategory slug
 *   • free-text query — matched against name, brand, manufacturer, generic
 *     dosage, pack, tags, conditions, aliases, and internalClass.
 *
 * Query is normalised through the typo map (`paracitamol` → `paracetamol`).
 */
export function applyFilters(products: Product[], filters: ListFilters): Product[] {
  const rawQ = filters.q?.trim().toLowerCase() ?? '';
  const q = normaliseSearch(rawQ);

  return products.filter((p) => {
    if (filters.category && p.category !== filters.category) return false;
    if (filters.subcategory && p.subcategory !== filters.subcategory) return false;
    if (!q) return true;

    const haystack = [
      p.name,
      p.brand,
      p.manufacturer ?? '',
      p.dosage ?? '',
      p.dosageForm ?? '',
      p.pack,
      p.internalClass ?? '',
      ...(p.tags ?? []),
      ...(p.conditions ?? []),
      ...(p.aliases ?? []),
    ]
      .join(' ')
      .toLowerCase();

    // Match if any token in the query appears in the haystack.
    // Splitting handles multi-word queries like "diabetes tablet".
    return q
      .split(/\s+/)
      .filter(Boolean)
      .every((token) => haystack.includes(token));
  });
}
