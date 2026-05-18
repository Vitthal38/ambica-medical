'use client';

import { useState } from 'react';
import type { Product } from './types';
import { placeholderUrl, toImageInput } from '@/lib/medicine-images/client';
import { cn } from '@/lib/cn';

interface Props {
  product: Product;
  /** Tailwind classes for the container — controls height + aspect ratio. */
  className?: string;
  /** Hint sizes for the browser's image picker. Mirrors `<img sizes>` attr. */
  sizes?: string;
  /**
   * If true: load eagerly + above-the-fold priority. Use for hero / first
   * card. Otherwise images load lazily as the user scrolls.
   */
  priority?: boolean;
  /** Object-fit mode. "contain" for pack-shots, "cover" for editorial photos. */
  fit?: 'contain' | 'cover';
}

/**
 * Renders a medicine pack-shot.
 *
 * Source order:
 *   1. product.imageUrl   — real photo (uploaded or manufacturer-supplied)
 *   2. placeholder SVG     — auto-generated, always available
 *
 * Strategy:
 *   - Try the primary image first.
 *   - If it errors (404, network, mixed-content), drop to the placeholder.
 *   - Both render through a plain <img> tag — Next/Image's optimizer can't
 *     process external URLs without remotePatterns config, and SVG
 *     placeholders are already tiny + perfectly cached at the edge.
 *
 * Visual choices:
 *   - White / off-white background (medical aesthetic)
 *   - `object-contain` so packshots never crop awkwardly
 *   - `padding` so the photo doesn't kiss the card border
 *   - Subtle hover zoom (group/hover from the parent card)
 *   - `loading="lazy"` by default; `priority` opts into eager loading
 */
export function ProductImage({
  product,
  className,
  sizes = '(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw',
  priority = false,
  fit = 'contain',
}: Props) {
  const primary = product.imageUrl;
  const fallback = placeholderUrl(toImageInput(product));
  const [src, setSrc] = useState(primary ?? fallback);

  // If the primary fails, swap to the placeholder once. Guarded so a broken
  // placeholder can't loop.
  const handleError = () => {
    if (src !== fallback) setSrc(fallback);
  };

  return (
    <div
      className={cn(
        'relative w-full overflow-hidden bg-white',
        // soft inner shadow gives the card depth without a heavy border
        'before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:shadow-[inset_0_0_0_1px_rgba(15,23,42,0.03)]',
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={`${product.brand} — ${product.name}${product.dosage ? ' ' + product.dosage : ''}`}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        fetchPriority={priority ? 'high' : 'auto'}
        sizes={sizes}
        onError={handleError}
        className={cn(
          'h-full w-full select-none p-4 transition-transform duration-300 group-hover:scale-[1.04]',
          fit === 'contain' ? 'object-contain' : 'object-cover',
        )}
        draggable={false}
      />
    </div>
  );
}
