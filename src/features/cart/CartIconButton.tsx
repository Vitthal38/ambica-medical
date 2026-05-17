'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { useCartStore, selectCartCount } from './cartStore';
import { cn } from '@/lib/cn';

interface Props {
  className?: string;
}

export function CartIconButton({ className }: Props) {
  const count = useCartStore(selectCartCount);
  // Avoid SSR/CSR hydration mismatch — the persisted cart only exists on the client.
  // Render the badge only after mount.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const showBadge = hydrated && count > 0;

  return (
    <Link
      href="/cart"
      aria-label={`Cart (${count} items)`}
      className={cn(
        'relative inline-flex h-11 w-11 items-center justify-center rounded-xl',
        'text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-primary-700',
        className,
      )}
    >
      <ShoppingCart className="h-5 w-5" strokeWidth={1.75} />
      {showBadge && (
        <span
          className="absolute -right-0.5 -top-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-600 px-1 text-[11px] font-bold text-white shadow-card"
          aria-hidden="true"
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}
