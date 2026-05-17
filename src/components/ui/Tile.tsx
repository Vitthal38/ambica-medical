import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Tint = 'green' | 'blue' | 'amber' | 'rose' | 'violet' | 'sky' | 'slate';
type Size = 'sm' | 'md' | 'lg';

interface TileProps extends HTMLAttributes<HTMLDivElement> {
  emoji: string;
  tint?: Tint;
  size?: Size;
}

const tintStyles: Record<Tint, string> = {
  green: 'bg-primary-50 text-primary-700',
  blue: 'bg-accent-50 text-accent-700',
  amber: 'bg-amber-50 text-amber-700',
  rose: 'bg-rose-50 text-rose-700',
  violet: 'bg-violet-50 text-violet-700',
  sky: 'bg-sky-50 text-sky-700',
  slate: 'bg-slate-100 text-slate-700',
};

const sizeStyles: Record<Size, string> = {
  sm: 'h-12 w-12 text-2xl rounded-xl',
  md: 'h-20 w-20 text-4xl rounded-2xl',
  lg: 'h-28 w-full text-5xl rounded-2xl',
};

/** Emoji-on-tinted-background tile — used as the visual on category and product cards. */
export function Tile({ emoji, tint = 'green', size = 'md', className, ...props }: TileProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center justify-center select-none',
        sizeStyles[size],
        tintStyles[tint],
        className,
      )}
      aria-hidden="true"
      {...props}
    >
      <span>{emoji}</span>
    </div>
  );
}
