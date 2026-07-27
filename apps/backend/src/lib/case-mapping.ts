/**
 * BUGFIX (discovered during Part 4 build): every repository was casting
 * raw Supabase rows (snake_case columns, e.g. `job_card_id`) directly to
 * the shared domain types (camelCase, e.g. `jobCardId`) with `as Type`.
 * A type cast doesn't transform data — the object at runtime still has
 * `job_card_id`, so `invoice.jobCardId` was `undefined`. This wasn't
 * caught in Part 2/3 because nothing yet read those specific fields back
 * out; Part 4's services (vehicle.customerId, invoice.paymentStatus, etc.)
 * are the first code to actually touch them, which is how it surfaced.
 *
 * Fix: transform at the repository boundary, in both directions, so
 * services can keep using the camelCase domain types as designed (PKG-004)
 * without every repository re-deriving this by hand.
 */

function snakeToCamel(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
}

function camelToSnake(key: string): string {
  return key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

export function rowToCamel<T>(row: Record<string, unknown> | null): T | null {
  if (!row) return null;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    out[snakeToCamel(key)] = value;
  }
  return out as T;
}

export function rowsToCamel<T>(rows: Record<string, unknown>[] | null): T[] {
  return (rows ?? []).map((row) => rowToCamel<T>(row) as T);
}

/**
 * Insert/update payload builders in this codebase are already written in
 * snake_case (matching DB columns directly, e.g. CustomerInsert.workshop_id)
 * — so writes don't need this. This direction exists only for the rare case
 * of building a payload from an already-camelCase object (e.g. forwarding
 * validated request input that happens to be camelCase).
 */
export function objectToSnake(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    out[camelToSnake(key)] = value;
  }
  return out;
}
