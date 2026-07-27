/** Mirrors the backend's PaginatedResult shape (apps/backend/src/db/repositories/base.repository.ts) — not exported from @me-and-mech/shared since it's a repository-layer concern, not a domain type, so duplicated here at the API boundary. */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
