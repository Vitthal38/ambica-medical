/**
 * POST /api/auth/login — customer sign-in by email OR mobile + password.
 *
 * Defense layers (mirrors the staff login route):
 *   1. IP rate limit (8 / 5 min).
 *   2. Zod validation.
 *   3. Identifier classification (email vs 10-digit mobile) server-side.
 *   4. Account-lockout check BEFORE bcrypt (short-circuit), with a dummy
 *      compare so a locked account doesn't leak via response timing.
 *   5. Constant-time bcrypt — same wall-clock whether the account exists or not.
 *   6. Uniform error ("Invalid login or password") — never reveals which.
 *   7. Audit every attempt; reset failure counter on success.
 */
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { loginSchema, classifyIdentifier } from '@/features/auth/schemas';
import { parseJson, errResponse } from '@/lib/validate';
import { limit, rateLimitKey } from '@/lib/rate-limit';
import { audit } from '@/lib/audit';
import { signCustomerSession, setCustomerSessionCookie } from '@/lib/customer-auth';
import { safeError } from '@/lib/error-envelope';

export const runtime = 'nodejs';

const BCRYPT_ROUNDS = 12;
const DUMMY_HASH = '$2a$12$KIXxQVxGz3Zz9tQrZb4WROK6lH3hN6lL2yWh.fEZjgg2EkRtO4RsK';
const MAX_FAILURES = 5;
const LOCK_MINUTES = 15;

export async function POST(req: Request) {
  try {
    const rl = limit(rateLimitKey(req, 'cust-login'), 8, 5 * 60);
    if (!rl.ok) {
      await audit({ req, actor: null }, { action: 'RATE_LIMIT_HIT', meta: { route: 'cust-login' } });
      return NextResponse.json(
        { error: 'Too many attempts. Try again later.', retryAfter: rl.retryAfter },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
      );
    }

    const parsed = await parseJson(req, loginSchema);
    if (!parsed.ok) return errResponse(parsed);

    const { kind, value } = classifyIdentifier(parsed.data.identifier);
    const customer =
      kind === 'email'
        ? await prisma.customer.findUnique({ where: { email: value }, select: sel })
        : kind === 'phone'
          ? await prisma.customer.findUnique({ where: { phone: value }, select: sel })
          : null;

    // Lockout check first.
    if (customer?.lockedUntil && customer.lockedUntil > new Date()) {
      await bcrypt.compare(parsed.data.password, DUMMY_HASH);
      await audit(
        { req, actor: null },
        { action: 'CUSTOMER_LOGIN_LOCKED', targetType: 'Customer', targetId: customer.id },
      );
      return NextResponse.json({ error: 'Invalid login or password.' }, { status: 401 });
    }

    // Constant-time compare. A walk-in with no passwordHash can't log in.
    const ok =
      customer && customer.passwordHash && !customer.deletedAt
        ? await bcrypt.compare(parsed.data.password, customer.passwordHash)
        : (await bcrypt.compare(parsed.data.password, DUMMY_HASH), false);

    if (!customer || !ok) {
      if (customer) {
        const failed = customer.failedLoginCount + 1;
        const locked = failed >= MAX_FAILURES;
        await prisma.customer.update({
          where: { id: customer.id },
          data: {
            failedLoginCount: failed,
            lockedUntil: locked ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null,
          },
        });
        await audit(
          { req, actor: null },
          {
            action: locked ? 'CUSTOMER_LOGIN_LOCKED' : 'CUSTOMER_LOGIN_FAILURE',
            targetType: 'Customer',
            targetId: customer.id,
            meta: { failedCount: failed },
          },
        );
      } else {
        await audit(
          { req, actor: null },
          { action: 'CUSTOMER_LOGIN_FAILURE', meta: { reason: 'unknown_identifier' } },
        );
      }
      return NextResponse.json({ error: 'Invalid login or password.' }, { status: 401 });
    }

    // Success — reset counters, stamp lastLogin.
    await prisma.customer.update({
      where: { id: customer.id },
      data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    const token = await signCustomerSession({
      sub: customer.id,
      name: customer.name,
      identifier: customer.email ?? customer.phone,
    });
    await setCustomerSessionCookie(token);

    await audit(
      { req, actor: null },
      { action: 'CUSTOMER_LOGIN_SUCCESS', targetType: 'Customer', targetId: customer.id },
    );

    return NextResponse.json({ ok: true, customer: { id: customer.id, name: customer.name } });
  } catch (e) {
    return safeError(e, req, { route: 'customer_login' });
  }
}

const sel = {
  id: true,
  name: true,
  email: true,
  phone: true,
  passwordHash: true,
  deletedAt: true,
  failedLoginCount: true,
  lockedUntil: true,
} as const;
