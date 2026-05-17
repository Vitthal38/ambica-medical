/**
 * Tiny structured logger — JSON line per event.
 *
 * Design constraints:
 *  - Zero deps (Vercel-friendly, edge-runtime friendly).
 *  - Always JSON so downstream log aggregators (Datadog, Logtail, Axiom) can
 *    parse without regex pain.
 *  - PHI-aware: a `redact` helper masks email/phone in user-facing log values
 *    so we never persist raw patient identifiers in plain log lines.
 *  - `level` honors LOG_LEVEL env (default: info in prod, debug otherwise).
 *
 * Use this instead of `console.log` everywhere.
 */
type Level = 'debug' | 'info' | 'warn' | 'error';
const LEVELS: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const CONFIGURED_LEVEL: Level =
  (process.env.LOG_LEVEL as Level | undefined) ??
  (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

function shouldLog(level: Level): boolean {
  return LEVELS[level] >= LEVELS[CONFIGURED_LEVEL];
}

function emit(level: Level, msg: string, meta: Record<string, unknown> = {}): void {
  if (!shouldLog(level)) return;
  const line = {
    t: new Date().toISOString(),
    level,
    msg,
    ...meta,
  };
  // Single stdout write — most platforms preserve order.
  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  fn(JSON.stringify(line));
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => emit('debug', msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => emit('info', msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => emit('warn', msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => emit('error', msg, meta),
};

/** Mask email for safe logging: `a***@example.com`. Returns null for null input. */
export function maskEmail(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const [user, domain] = raw.split('@');
  if (!user || !domain) return '***';
  const head = user[0] ?? '*';
  return `${head}***@${domain}`;
}

/** Mask phone keeping first 2 / last 2 digits: `98******10`. */
export function maskPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (raw.length <= 4) return '***';
  return `${raw.slice(0, 2)}${'*'.repeat(raw.length - 4)}${raw.slice(-2)}`;
}
