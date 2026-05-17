/**
 * Tiny in-memory rate limiter — adequate for a single-instance internal admin.
 *
 * For multi-instance prod, swap the Map for Redis. The interface stays the
 * same so call sites don't change.
 *
 * Used on /api/admin/auth/login to slow brute-force attempts.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/**
 * @returns { ok, remaining, retryAfter }  retryAfter is seconds until reset.
 */
export function limit(
  key: string,
  max: number,
  windowSeconds: number,
): { ok: boolean; remaining: number; retryAfter: number } {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    const resetAt = now + windowSeconds * 1000;
    buckets.set(key, { count: 1, resetAt });
    return { ok: true, remaining: max - 1, retryAfter: 0 };
  }
  if (bucket.count >= max) {
    return { ok: false, remaining: 0, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  bucket.count += 1;
  return { ok: true, remaining: max - bucket.count, retryAfter: 0 };
}

export function rateLimitKey(req: Request, suffix = ''): string {
  // x-forwarded-for from your reverse proxy in production. Fallback for local.
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'local';
  return `${ip}:${suffix}`;
}
