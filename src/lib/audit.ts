/**
 * Audit log service.
 *
 * Single insert per sensitive event. Failures here MUST NOT block the calling
 * operation (an audit-write failure shouldn't drop a real PHI write on the
 * floor) — but they ARE logged via the app logger so an operator can spot a
 * persistent audit-write outage.
 *
 * Compliance principles encoded:
 *   - Append-only: this module only INSERTS. Never updates, never deletes.
 *   - Actor snapshot: we save the email at event time so the log row survives
 *     a later user delete/rename.
 *   - PHI scrubbed: `meta` should NEVER include raw patient names, phones,
 *     prescription contents. Callers pass IDs and masked identifiers.
 */
import type { AuditAction } from '@prisma/client';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export interface AuditCtx {
  /** Caller's Request — we pull IP, UA, x-request-id from it. */
  req: Request;
  /** Acting user (null for unauthenticated events like login attempts). */
  actor?: { id: string; email: string } | null;
}

export interface AuditEntry {
  action: AuditAction;
  /** What was acted upon — e.g. type="Customer", id=customer.id. Optional. */
  targetType?: string;
  targetId?: string;
  /** Action-specific context. NEVER pass raw PHI here. IDs + outcomes only. */
  meta?: Record<string, unknown>;
}

function clientIp(req: Request): string | null {
  const xf = req.headers.get('x-forwarded-for');
  if (xf) return xf.split(',')[0].trim().slice(0, 64);
  return req.headers.get('x-real-ip')?.slice(0, 64) ?? null;
}

function clientUa(req: Request): string | null {
  return req.headers.get('user-agent')?.slice(0, 512) ?? null;
}

/**
 * Record an audit event. Best-effort — a DB hiccup here logs but doesn't throw.
 */
export async function audit(ctx: AuditCtx, entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: entry.action,
        actorId: ctx.actor?.id ?? null,
        actorEmail: ctx.actor?.email ?? null,
        targetType: entry.targetType ?? null,
        targetId: entry.targetId ?? null,
        ip: clientIp(ctx.req),
        userAgent: clientUa(ctx.req),
        requestId: ctx.req.headers.get('x-request-id') ?? null,
        meta: entry.meta ? (entry.meta as object) : undefined,
      },
    });
  } catch (err) {
    // NEVER bubble — audit failure must not break the actual write/read.
    logger.error('audit.write_failed', {
      action: entry.action,
      err: err instanceof Error ? err.message : String(err),
    });
  }
}
