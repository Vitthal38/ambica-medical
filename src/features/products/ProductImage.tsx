'use client';

import { useState } from 'react';
import type { Product } from './types';
import { Tile } from '@/components/ui/Tile';
import { cn } from '@/lib/cn';

interface Props {
  product: Product;
  /** Tailwind size for the image container. Examples: "h-32", "h-80" */
  className?: string;
  /** Fallback Tile size when no image is available */
  tileSize?: 'sm' | 'md' | 'lg';
  /** Tailwind text-size for the emoji fallback */
  emojiClassName?: string;
  priority?: boolean;
}

/**
 * Renders the product photo when `imageUrl` is present, otherwise falls back
 * to the emoji-on-tinted-tile visual. If the image fails to load (404, etc.)
 * it auto-fails back to the tile too.
 */
export function ProductImage({
  product,
  className,
  tileSize = 'lg',
  emojiClassName = 'text-6xl',
  priority = false,
}: Props) {
  const [errored, setErrored] = useState(false);

  if (!product.imageUrl || errored) {
    return (
      <Tile
        emoji={product.emoji}
        tint={product.tile}
        size={tileSize}
        className={cn('w-full rounded-none', className, emojiClassName)}
      />
    );
  }

  return (
    <div className={cn('relative w-full overflow-hidden bg-neutral-50', className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={product.imageUrl}
        alt={`${product.brand} — ${product.name}`}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onError={() => setErrored(true)}
        className="h-full w-full object-contain p-3 transition-transform duration-300 group-hover:scale-[1.04]"
      />
    </div>
  );
}
