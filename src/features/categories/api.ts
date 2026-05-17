import { useQuery } from '@tanstack/react-query';
import { fetchCategories } from '@/lib/fetcher';
import { categoryKeys } from '@/features/products/queryKeys';

export function useCategories() {
  return useQuery({
    queryKey: categoryKeys.all,
    queryFn: fetchCategories,
  });
}
