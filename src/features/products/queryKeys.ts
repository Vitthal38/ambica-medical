export const productKeys = {
  all: ['products'] as const,
  byId: (id: string) => ['products', id] as const,
  list: (filters?: { category?: string; q?: string }) =>
    ['products', filters] as const,
};

export const categoryKeys = {
  all: ['categories'] as const,
};
