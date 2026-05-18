import type { ReactNode } from 'react';
import { Container } from './Container';

interface LegalShellProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  lastUpdated?: string;
  children: ReactNode;
}

/**
 * Shared shell for prose-heavy pages (privacy, terms, return policy, FAQ).
 * Keeps the hero band + content card consistent without dragging Tailwind
 * Typography in. The .prose-style spacing is achieved with plain selectors so
 * we don't add a new dep.
 */
export function LegalShell({ eyebrow, title, subtitle, lastUpdated, children }: LegalShellProps) {
  return (
    <>
      <section className="bg-gradient-to-b from-primary-50/40 to-transparent py-10 md:py-14">
        <Container className="max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-primary-700">
            {eyebrow}
          </span>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
          {subtitle && (
            <p className="mx-auto mt-3 max-w-xl text-sm text-neutral-600 sm:text-base">{subtitle}</p>
          )}
          {lastUpdated && (
            <p className="mt-3 text-xs text-neutral-500">Last updated: {lastUpdated}</p>
          )}
        </Container>
      </section>

      <section className="pb-16">
        <Container className="max-w-3xl">
          <article
            className={[
              'rounded-2xl border border-neutral-200 bg-white p-6 sm:p-10',
              // base prose styling without @tailwindcss/typography
              '[&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-neutral-900',
              '[&_h2:first-child]:mt-0',
              '[&_h3]:mt-6 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-neutral-900',
              '[&_p]:mt-3 [&_p]:text-[15px] [&_p]:leading-relaxed [&_p]:text-neutral-700',
              '[&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-6 [&_ul]:text-[15px] [&_ul]:text-neutral-700',
              '[&_ol]:mt-3 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-6 [&_ol]:text-[15px] [&_ol]:text-neutral-700',
              '[&_li]:leading-relaxed',
              '[&_a]:font-medium [&_a]:text-primary-700 [&_a]:underline-offset-2 hover:[&_a]:underline',
              '[&_strong]:font-semibold [&_strong]:text-neutral-900',
              '[&_code]:rounded [&_code]:bg-neutral-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[13px] [&_code]:text-neutral-800',
            ].join(' ')}
          >
            {children}
          </article>
        </Container>
      </section>
    </>
  );
}
