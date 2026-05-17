/**
 * Admin-only UI primitives. Dark theme, zinc palette, separate from the
 * public site's light-theme components in src/components/ui/*.
 */
import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

/* ---------------- Button ---------------- */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const btnVariant: Record<Variant, string> = {
  primary:
    'bg-emerald-500 text-zinc-950 hover:bg-emerald-400 active:bg-emerald-300 disabled:bg-zinc-700 disabled:text-zinc-400',
  secondary:
    'bg-zinc-800 text-zinc-100 hover:bg-zinc-700 active:bg-zinc-700/80 border border-zinc-700',
  ghost:
    'bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100',
  danger:
    'bg-rose-600 text-white hover:bg-rose-500 active:bg-rose-700',
};

const btnSize: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs rounded-md',
  md: 'h-10 px-4 text-sm rounded-md',
  lg: 'h-12 px-5 text-sm rounded-md',
};

export const AdminButton = forwardRef<HTMLButtonElement, BtnProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium transition-colors',
        'disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50',
        btnVariant[variant],
        btnSize[size],
        className,
      )}
      {...props}
    />
  ),
);
AdminButton.displayName = 'AdminButton';

/* ---------------- Input ---------------- */

type AdminInputProps = InputHTMLAttributes<HTMLInputElement>;

export const AdminInput = forwardRef<HTMLInputElement, AdminInputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-10 w-full rounded-md bg-zinc-900 px-3 text-sm text-zinc-100 placeholder:text-zinc-500',
        'border border-zinc-700 transition-colors',
        'focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30',
        'disabled:cursor-not-allowed disabled:bg-zinc-800',
        className,
      )}
      {...props}
    />
  ),
);
AdminInput.displayName = 'AdminInput';

/* ---------------- Card ---------------- */

export function AdminCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-sm',
        'shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_2px_8px_rgba(0,0,0,0.4)]',
        className,
      )}
      {...props}
    />
  );
}

/* ---------------- Badge ---------------- */

type BadgeTone = 'default' | 'success' | 'warning' | 'danger' | 'rx' | 'info';

const badgeStyles: Record<BadgeTone, string> = {
  default: 'bg-zinc-800 text-zinc-300 border-zinc-700',
  success: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  warning: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  danger: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
  rx: 'bg-rose-600/15 text-rose-300 border-rose-500/40',
  info: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
};

export function AdminBadge({
  tone = 'default',
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
        badgeStyles[tone],
        className,
      )}
      {...props}
    />
  );
}

/* ---------------- Section ---------------- */

export function AdminSection({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-zinc-100">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-zinc-500">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
