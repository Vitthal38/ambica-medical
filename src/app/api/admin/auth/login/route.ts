import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { signSession, setSessionCookie } from '@/lib/auth';
import type { Role } from '@/lib/rbac';
import { loginSchema } from '@/features/admin/schemas';
import { parseJson, errResponse } from '@/lib/validate';
import { limit, rateLimitKey } from '@/lib/rate-limit';

// Force this route into the Node.js runtime because bcrypt isn't compatible
// with the edge runtime.
export const runtime = 'nodejs';

export async function POST(req: Request) {
  // 5 attempts per IP per 5 minutes. Tighten in prod via Redis-backed limiter.
  const rl = limit(rateLimitKey(req, 'login'), 5, 5 * 60);
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again later.', retryAfter: rl.retryAfter },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
    );
  }

  const parsed = await parseJson(req, loginSchema);
  if (!parsed.ok) return errResponse(parsed);

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      passwordHash: true,
      active: true,
    },
  });

  // Constant-time-ish: always do a bcrypt compare so timing doesn't leak
  // whether the email exists.
  const dummy = '$2a$10$dummyhashxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
  const ok =
    user && user.active
      ? await bcrypt.compare(parsed.data.password, user.passwordHash)
      : (await bcrypt.compare(parsed.data.password, dummy), false);

  if (!user || !ok) {
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const token = await signSession({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role as Role,
  });
  await setSessionCookie(token);

  return NextResponse.json({
    ok: true,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
}
