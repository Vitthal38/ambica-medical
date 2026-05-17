/**
 * Admin sign-in.
 *
 * Layers of defense (in order):
 *   1. IP-based rate limit (5 attempts / 5 min) — slows naive brute force.
 *   2. Schema validation — Zod rejects bad payloads early.
 *   3. Constant-time bcrypt — same wall-clock whether the email exists or not,
 *      so attackers can't enumerate accounts via timing.
 *   4. DB-backed account lockout — 5 consecutive failures locks an account
 *      for 15 minutes (LOCKOUT_POLICY). Resets on success.
 *   5. Audit log — every login attempt (success, failure, locked) is recorded
 *      with actor, IP, UA, request id. NEVER store the password.
 *   6. Password hash migration — if the stored hash has fewer rounds than
 *      current policy (12), transparently rehash on successful login.
 *
 * The route NEVER reveals whether a given email exists OR whether the account
 * is locked. The public-facing error is uniform: "Invalid email or password."
 * The audit log captures the real reason for operator review.
 */
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { signSession, setSessionCookie } from '@/lib/auth';
import type { Role } from '@/lib/rbac';
import { loginSchema } from '@/features/admin/schemas';
import { parseJson, errResponse } from '@/lib/validate';
import { limit, rateLimitKey } from '@/lib/rate-limit';
import { audit } from '@/lib/audit';
import {
  readLockState,
  recordFailure,
  clearLock,
  LOCKOUT_POLICY,
} from '@/lib/security/lockout';
import { safeError } from '@/lib/error-envelope';
import { logger, maskEmail } from '@/lib/logger';

export const runtime = 'nodejs';

const BCRYPT_ROUNDS = 12;
// Pre-computed hash for the timing-side-channel defense. Generated with the
// same cost as BCRYPT_ROUNDS so the dummy compare burns equivalent CPU.
const DUMMY_HASH = '$2a$12$KIXxQVxGz3Zz9tQrZb4WROK6lH3hN6lL2yWh.fEZjgg2EkRtO4RsK';

export async function POST(req: Request) {
  try {
    // ---- Layer 1: IP-based rate limit ----
    const rl = limit(rateLimitKey(req, 'login'), 5, 5 * 60);
    if (!rl.ok) {
      await audit(
        { req, actor: null },
        { action: 'RATE_LIMIT_HIT', meta: { route: 'login', retryAfter: rl.retryAfter } },
      );
      return NextResponse.json(
        { error: 'Too many attempts. Try again later.', retryAfter: rl.retryAfter },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
      );
    }

    // ---- Layer 2: schema validation ----
    const parsed = await parseJson(req, loginSchema);
    if (!parsed.ok) return errResponse(parsed);

    const email = parsed.data.email.toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        passwordHash: true,
        active: true,
        failedLoginCount: true,
        lockedUntil: true,
      },
    });

    // ---- Layer 4: lockout check (run BEFORE bcrypt to short-circuit) ----
    if (user && user.lockedUntil && user.lockedUntil > new Date()) {
      // Still burn the same CPU so the wall-clock matches the "wrong password"
      // path → don't leak "this account is locked" via timing.
      await bcrypt.compare(parsed.data.password, DUMMY_HASH);
      await audit(
        { req, actor: { id: user.id, email: user.email } },
        { action: 'LOGIN_LOCKED', targetType: 'User', targetId: user.id },
      );
      logger.warn('login.locked_account_attempt', { userId: user.id, email: maskEmail(email) });
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    // ---- Layer 3: constant-time bcrypt ----
    const ok =
      user && user.active
        ? await bcrypt.compare(parsed.data.password, user.passwordHash)
        : (await bcrypt.compare(parsed.data.password, DUMMY_HASH), false);

    if (!user || !ok) {
      if (user) {
        const state = await recordFailure(user.id);
        logger.warn('login.failure', {
          userId: user.id,
          failedCount: state.failedCount,
          locked: state.locked,
          email: maskEmail(email),
        });
        await audit(
          { req, actor: { id: user.id, email: user.email } },
          {
            action: state.locked ? 'LOGIN_LOCKED' : 'LOGIN_FAILURE',
            targetType: 'User',
            targetId: user.id,
            meta: { failedCount: state.failedCount },
          },
        );
      } else {
        logger.info('login.unknown_email', { email: maskEmail(email) });
        await audit(
          { req, actor: null },
          { action: 'LOGIN_FAILURE', meta: { reason: 'unknown_email' } },
        );
      }
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    // ---- Success path ----
    await clearLock(user.id);

    // ---- Layer 6: opportunistic rehash if cost dropped behind policy ----
    try {
      const currentRounds = parseInt(user.passwordHash.split('$')[2] ?? '0', 10);
      if (currentRounds < BCRYPT_ROUNDS) {
        const rehashed = await bcrypt.hash(parsed.data.password, BCRYPT_ROUNDS);
        await prisma.user.update({
          where: { id: user.id },
          data: { passwordHash: rehashed },
        });
        logger.info('login.password_rehashed', { userId: user.id });
      }
    } catch {
      // Rehash failure must not block login. Log + carry on.
      logger.warn('login.rehash_failed', { userId: user.id });
    }

    const token = await signSession({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role as Role,
    });
    await setSessionCookie(token);

    await audit(
      { req, actor: { id: user.id, email: user.email } },
      { action: 'LOGIN_SUCCESS', targetType: 'User', targetId: user.id },
    );

    return NextResponse.json({
      ok: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (e) {
    return safeError(e, req, { route: 'login' });
  }
}

export const LOGIN_POLICY = LOCKOUT_POLICY;
