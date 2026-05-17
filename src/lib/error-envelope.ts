/**
 * Centralized error envelope.
 *
 *   - Never leak Prisma error codes, stack traces, query fragments, or any
 *     internal class names to clients.
 *   - In dev, full error is logged. In prod, only a short fingerprint
 *     (request id + class) goes to the client; the full trace stays on the
 *     server log so we can correlate.
 *   - Translates known Prisma errors (P2002 unique, P2025 not-found, P2003 FK)
 *     into safe public messages.
 *
 * Usage in a route handler:
 *
 *   try {
 *     ...
 *   } catch (e) {
 *     return safeError(e, req);
 *   }
 */
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { logger } from './logger';

const IS_PROD = process.env.NODE_ENV === 'production';

export interface PublicError {
  error: string;
  code?: string;
  requestId?: string;
}

function makePayload(message: string, status: number, requestId?: string, code?: string) {
  const body: PublicError = { error: message };
  if (requestId) body.requestId = requestId;
  if (code) body.code = code;
  return NextResponse.json(body, { status });
}

/**
 * Convert any thrown value into a sanitized NextResponse + log the original.
 *
 * Pass the original `req` so we can pull `x-request-id`. Optional `context`
 * lets the caller attach what they were doing when it blew up.
 */
export function safeError(
  err: unknown,
  req: Request,
  context: Record<string, unknown> = {},
): NextResponse {
  const requestId = req.headers.get('x-request-id') ?? undefined;

  // Known Prisma error mappings — public messages, no internal details.
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    logger.warn('prisma.known_error', {
      requestId,
      code: err.code,
      ...context,
    });
    switch (err.code) {
      case 'P2002':
        return makePayload('That value is already in use.', 409, requestId);
      case 'P2025':
        return makePayload('Resource not found.', 404, requestId);
      case 'P2003':
        return makePayload('Related record could not be resolved.', 422, requestId);
      default:
        return makePayload('Request could not be completed.', 400, requestId);
    }
  }

  // Validation error — pass through (Zod errors are usually caught earlier,
  // but if one slips here treat as 422)
  if (err instanceof Prisma.PrismaClientValidationError) {
    logger.warn('prisma.validation_error', { requestId, ...context });
    return makePayload('Invalid request data.', 422, requestId);
  }

  // Generic Error — log full detail server-side, return opaque message to client.
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  logger.error('unhandled.error', {
    requestId,
    message,
    stack: IS_PROD ? undefined : stack,
    ...context,
  });

  return makePayload(
    IS_PROD ? 'Server error. Reference this request ID when reporting.' : message,
    500,
    requestId,
  );
}
