/**
 * Zod helpers shared across admin APIs.
 *
 *  - parseJson: parses + validates a Request's JSON body against a schema
 *    and returns { ok, data } | { ok: false, error }.
 *  - Reuses the file-size and MIME allowlist from the public prescription
 *    schema so admin uploads share the same rules. The public flow is NEVER
 *    imported as code — only its constants. No coupling beyond data shape.
 */
import { ZodError, z } from 'zod';
import { ALLOWED_TYPES, MAX_FILE_SIZE } from '@/features/prescription/schema';

export { ALLOWED_TYPES, MAX_FILE_SIZE };

export interface ParseSuccess<T> {
  ok: true;
  data: T;
}
export interface ParseFailure {
  ok: false;
  error: string;
  fieldErrors?: Record<string, string[]>;
  status: number;
}
export type ParseResult<T> = ParseSuccess<T> | ParseFailure;

export async function parseJson<T extends z.ZodTypeAny>(
  req: Request,
  schema: T,
): Promise<ParseResult<z.infer<T>>> {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return zodErrorToResult(parsed.error);
    }
    return { ok: true, data: parsed.data };
  } catch {
    return { ok: false, error: 'Invalid JSON body', status: 400 };
  }
}

export function zodErrorToResult(err: ZodError): ParseFailure {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const key = issue.path.join('.') || '_';
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return {
    ok: false,
    error: 'Validation failed',
    fieldErrors,
    status: 422,
  };
}

/** Build a JSON Response from an error result. */
export function errResponse(err: ParseFailure): Response {
  return new Response(JSON.stringify(err), {
    status: err.status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/* ----------- shared validators ----------- */

export const indianPhone = z
  .string()
  .regex(/^[6-9]\d{9}$/, 'Enter a 10-digit Indian mobile number');

export const isoDate = z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/));
