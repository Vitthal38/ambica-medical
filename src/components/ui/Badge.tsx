import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'rx' | 'otc' | 'discount' | 'success' | 'danger' | 'neutral';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

const toneStyles: Record<Tone, string> = {
  rx: 'bg-rx text-white',
  otc: 'bg-otc text-white',
  discount: 'bg-amber-100 text-amber-800 border border-amber-200',
  success: 'bg-primary-50 text-primary-700 border border-primary-100',
  danger: 'bg-rose-50 text-rose-700 border border-rose-100',
  neutral: 'bg-neutral-100 text-neutral-700 border border-neutral-200',
};

export function Badge({ className, tone = 'neutral', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
        toneStyles[tone],
        className,
      )}
      {...props}
    />
  );
}
