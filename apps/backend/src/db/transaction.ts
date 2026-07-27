import type { SupabaseClient } from '@supabase/supabase-js';
import { AppError } from '../lib/errors';
import { ErrorCode } from '@me-and-mech/shared';

/**
 * PKG-011 — Transaction helper.
 *
 * PostgREST (Supabase's REST layer) has no concept of a multi-statement
 * client-side transaction — there is no BEGIN/COMMIT across separate
 * `.from(...)` calls. Real atomicity for multi-table operations (e.g. the
 * 6-step onboarding transaction in PKG-018) is implemented as a single
 * Postgres function (`CREATE FUNCTION ... LANGUAGE plpgsql`) that does all
 * the writes inside one implicit transaction, and is invoked here via RPC.
 *
 * This helper is intentionally thin — it standardizes error handling
 * around `.rpc()` calls so every atomic operation in the codebase fails
 * the same way, rather than re-implementing this per call site.
 */
export async function callTransactionalRpc<T>(
  client: SupabaseClient,
  functionName: string,
  args: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await client.rpc(functionName, args);

  if (error) {
    throw new AppError(
      ErrorCode.INTERNAL,
      `Transactional operation "${functionName}" failed: ${error.message}`,
      500,
      { functionName, code: error.code },
    );
  }

  return data as T;
}
