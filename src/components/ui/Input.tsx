import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-11 w-full rounded-xl bg-white px-4 text-sm text-neutral-900 placeholder:text-neutral-400',
        'border border-neutral-200 transition-colors',
        'focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100',
        'disabled:cursor-not-allowed disabled:bg-neutral-100',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';
