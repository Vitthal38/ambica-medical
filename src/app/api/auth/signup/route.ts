/**
 * POST /api/auth/signup — customer self-registration.
 *
 * Defense layers (mirrors the staff login route):
 *   1. IP rate limit (5 / 10 min) — slows scripted account creation.
 *   2. Zod schema validation.
 *   3. Duplicate check on email AND phone — uniform "account exists" response
 *      so we don't leak which identifier is taken via a different error.
 *   4. bcrypt hash (cost 12). Plain password NEVER stored or logged.
 *   5. Session issued on success (auto-login). Audit row appended.
 *
 * Creates the customer record (which doubles as the patient record). If an
 * admin already created a walk-in with this phone/email, signup is rejected —
 * the customer should log in / reset instead of creating a duplicate.
 */
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { signupSchema } from '@/features/auth/schemas';
import { parseJson, errResponse } from '@/lib/validate';
import { limit, rateLimitKey } from '@/lib/rate-limit';
import { audit } from '@/lib/audit';
import { signCustomerSession, setCustomerSessionCookie } from '@/lib/customer-auth';
import { safeError } from '@/lib/error-envelope';

export const runtime = 'nodejs';

const BCRYPT_ROUNDS = 12;

export async function POST(req: Request) {
  try {
    const rl = limit(rateLimitKey(req, 'signup'), 5, 10 * 60);
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Too many attempts. Try again later.', retryAfter: rl.retryAfter },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
      );
    }

    const parsed = await parseJson(req, signupSchema);
    if (!parsed.ok) return errResponse(parsed);

    const email = parsed.data.email?.trim().toLowerCase() || null;
    const phone = parsed.data.phone?.trim() || null;
    const name = parsed.data.name.trim();

    // Duplicate check — uniform response regardless of which field collides.
    const existing = await prisma.customer.findFirst({
      where: {
        OR: [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])],
      },
      select: { id: true, passwordHash: true },
    });
    if (existing) {
      // If the record exists but has no password (admin-created walk-in), guide
      // them to set one rather than block forever. Still uniform from outside.
      return NextResponse.json(
        {
          error:
            'An account with these details already exists. Please log in, or reset your password.',
        },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, BCRYPT_ROUNDS);

    // phone is required-unique on the model; if signup only gave email, we
    // synthesize nothing — phone stays null only if the schema allowed it.
    // The model requires phone unique but nullable is NOT allowed (phone is
    // non-null unique). So require phone OR generate a placeholder is wrong;
    // instead: if no phone supplied, we still need a phone value. Guard here.
    if (!phone) {
      return NextResponse.json(
        { error: 'A mobile number is required to create an account.' },
        { status: 422, headers: { 'content-type': 'application/json' } },
      );
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        phone,
        email,
        passwordHash,
      },
      select: { id: true, name: true, email: true, phone: true },
    });

    const token = await signCustomerSession({
      sub: customer.id,
      name: customer.name,
      identifier: customer.email ?? customer.phone,
    });
    await setCustomerSessionCookie(token);

    await audit(
      { req, actor: null },
      {
        action: 'CUSTOMER_SIGNUP',
        targetType: 'Customer',
        targetId: customer.id,
        meta: { hasEmail: !!email, hasPhone: !!phone },
      },
    );

    return NextResponse.json({
      ok: true,
      customer: { id: customer.id, name: customer.name },
    });
  } catch (e) {
    return safeError(e, req, { route: 'customer_signup' });
  }
}
