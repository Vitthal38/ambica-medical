import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

const STEPS = [
  'Upload prescription',
  'Patient details',
  'Pharmacist reviews',
  'Order dispatched',
];

interface Props {
  current: number;
  className?: string;
  /** Compact mode for use inside the landing-page promo card */
  compact?: boolean;
}

export function StepIndicator({ current, className, compact }: Props) {
  return (
    <ol
      className={cn(
        'flex w-full items-start gap-2',
        compact ? 'gap-3' : 'sm:gap-4',
        className,
      )}
    >
      {STEPS.map((label, i) => {
        const idx = i + 1;
        const isComplete = idx < current;
        const isActive = idx === current;
        return (
          <li key={label} className="flex flex-1 flex-col items-center text-center">
            <div className="relative flex w-full items-center">
              {/* connector */}
              {i > 0 && (
                <div
                  className={cn(
                    'absolute right-1/2 top-1/2 h-0.5 w-full -translate-y-1/2',
                    isComplete || isActive ? 'bg-primary-500' : 'bg-neutral-200',
                  )}
                />
              )}
              <div
                className={cn(
                  'relative z-10 mx-auto inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-colors',
                  isComplete && 'bg-primary-600 text-white',
                  isActive && 'bg-white text-primary-700 ring-2 ring-primary-500 shadow-card',
                  !isComplete && !isActive && 'bg-neutral-100 text-neutral-500',
                )}
              >
                {isComplete ? <Check className="h-4 w-4" strokeWidth={3} /> : idx}
              </div>
            </div>
            <span
              className={cn(
                'mt-2 text-[11px] font-semibold uppercase tracking-wider sm:text-xs',
                isActive ? 'text-primary-700' : 'text-neutral-500',
                compact && 'hidden sm:inline',
              )}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
