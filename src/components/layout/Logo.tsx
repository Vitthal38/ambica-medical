import Link from 'next/link';
import { cn } from '@/lib/cn';

/** Caduceus + wordmark, used in navbar and footer. */
export function Logo({ className, mono = false }: { className?: string; mono?: boolean }) {
  return (
    <Link
      href="/"
      className={cn('inline-flex items-center gap-2 group', className)}
      aria-label="Ambica Medical — home"
    >
      <span
        className={cn(
          'inline-flex h-9 w-9 items-center justify-center rounded-xl text-white text-lg font-bold transition-transform group-hover:scale-105',
          mono ? 'bg-white text-primary-700' : 'bg-primary-600',
        )}
        aria-hidden="true"
      >
        ⚕
      </span>
      <span className="flex flex-col leading-tight">
        <span className={cn('font-bold tracking-tight', mono ? 'text-white' : 'text-neutral-900')}>
          Ambica Medical
        </span>
        <span className={cn('text-[10px] uppercase tracking-widest', mono ? 'text-primary-100' : 'text-primary-700')}>
          Licensed Pharmacy · Aurangabad
        </span>
      </span>
    </Link>
  );
}
