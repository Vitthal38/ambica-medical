import { type HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Adds the hover-shadow lift used for clickable product/category cards */
  interactive?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, interactive, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-2xl bg-white border border-neutral-200/70 shadow-card',
        interactive &&
          'transition-shadow duration-200 hover:shadow-cardHover hover:border-neutral-300',
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = 'Card';
