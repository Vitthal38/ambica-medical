/**
 * Brute-force lockout — DB-backed, survives serverless cold starts.
 *
 * Policy (configurable via env if needed, sane defaults baked in):
 *   - After 5 consecutive failed logins for the same account, lock it for
 *     LOCKOUT_MINUTES (default 15).
 *   - Each subsequent failure during a lockout extends nothing — the user
 *     simply gets a generic "Try again later" response (we never reveal that
 *     lock status to the unauthenticated client; only that login failed).
 *   - A successful login resets the counter and clears the lock.
 *
 * Why DB and not Redis: we already have Postgres, the failure-counter writes
 * happen only on login attempts (low volume), and the row is keyed by user id
 * (so the counter is naturally per-account, not per-IP).
 */
import { prisma } from '@/lib/db';

const MAX_FAILURES = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

export interface LockState {
  /** True if the account is currently locked (regardless of password). */
  locked: boolean;
  /** When the lock expires, if locked. */
  lockedUntil: Date | null;
  /** Current failure count (after the most recent recordFailure). */
  failedCount: number;
}

/** Read current state for a user id. Does NOT mutate. */
export async function readLockState(userId: string): Promise<LockState> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { failedLoginCount: true, lockedUntil: true },
  });
  if (!u) return { locked: false, lockedUntil: null, failedCount: 0 };
  const now = new Date();
  const locked = !!(u.lockedUntil && u.lockedUntil > now);
  return {
    locked,
    lockedUntil: locked ? u.lockedUntil : null,
    failedCount: u.failedLoginCount,
  };
}

/** Increment fail counter; if threshold hit, set lockedUntil. */
export async function recordFailure(userId: string): Promise<LockState> {
  // Read-modify-write in a transaction so concurrent attempts don't race.
  return prisma.$transaction(async (tx) => {
    const u = await tx.user.findUnique({
      where: { id: userId },
      select: { failedLoginCount: true, lockedUntil: true },
    });
    if (!u) return { locked: false, lockedUntil: null, failedCount: 0 };

    const next = u.failedLoginCount + 1;
    const lockedUntil = next >= MAX_FAILURES ? new Date(Date.now() + LOCKOUT_MS) : u.lockedUntil;

    await tx.user.update({
      where: { id: userId },
      data: { failedLoginCount: next, lockedUntil },
    });

    return {
      locked: !!(lockedUntil && lockedUntil > new Date()),
      lockedUntil,
      failedCount: next,
    };
  });
}

/** Reset on successful login. */
export async function clearLock(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
  });
}

export const LOCKOUT_POLICY = {
  MAX_FAILURES,
  LOCKOUT_MS,
} as const;
