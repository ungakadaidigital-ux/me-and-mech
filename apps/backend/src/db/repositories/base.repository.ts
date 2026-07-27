import type { SupabaseClient } from '@supabase/supabase-js';
import { AppError, NotFoundError } from '../../lib/errors';
import { ErrorCode } from '@me-and-mech/shared';
import { rowToCamel, rowsToCamel } from '../../lib/case-mapping';

export interface FindOptions {
  page?: number;
  limit?: number;
  orderBy?: { column: string; ascending?: boolean };
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

/**
 * PKG-012 — Base Repository Pattern.
 *
 * Every domain repository (PKG-013) extends this. It standardizes:
 *   - workshop_id scoping on every query (defense-in-depth alongside RLS —
 *     repositories should never rely on RLS as the *only* guard, since a
 *     service-role-backed call bypasses RLS entirely)
 *   - pagination shape
 *   - not-found handling
 *
 * Repositories do NOT implement soft-delete by default — none of the
 * locked schema tables have a deleted_at column (workshops/customers/
 * vehicles/job_cards are hard-deleted only via ON DELETE CASCADE from
 * their parent, never directly by end users in the MVP feature set).
 * If a future table needs soft delete, add the column and override
 * `delete()` in that specific repository — don't add unused plumbing here.
 */
export abstract class BaseRepository<TRow, TInsert, TUpdate> {
  protected constructor(
    protected readonly client: SupabaseClient,
    protected readonly tableName: string,
  ) {}

  async findById(id: string, workshopId: string): Promise<TRow | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .eq('workshop_id', workshopId)
      .maybeSingle();

    if (error) throw this.wrapError('findById', error);
    return rowToCamel<TRow>(data);
  }

  async findByIdOrThrow(id: string, workshopId: string, resourceName: string): Promise<TRow> {
    const row = await this.findById(id, workshopId);
    if (!row) throw new NotFoundError(resourceName);
    return row;
  }

  async findMany(workshopId: string, options: FindOptions = {}): Promise<PaginatedResult<TRow>> {
    const page = options.page ?? 1;
    const limit = options.limit ?? 20;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = this.client
      .from(this.tableName)
      .select('*', { count: 'exact' })
      .eq('workshop_id', workshopId)
      .range(from, to);

    if (options.orderBy) {
      query = query.order(options.orderBy.column, { ascending: options.orderBy.ascending ?? true });
    }

    const { data, error, count } = await query;
    if (error) throw this.wrapError('findMany', error);

    return { items: rowsToCamel<TRow>(data), total: count ?? 0, page, limit };
  }

  async create(payload: TInsert): Promise<TRow> {
    const { data, error } = await this.client.from(this.tableName).insert(payload).select().single();
    if (error) throw this.wrapError('create', error);
    return rowToCamel<TRow>(data) as TRow;
  }

  async update(id: string, workshopId: string, payload: TUpdate): Promise<TRow> {
    const { data, error } = await this.client
      .from(this.tableName)
      .update(payload as Record<string, unknown>)
      .eq('id', id)
      .eq('workshop_id', workshopId)
      .select()
      .single();

    if (error) throw this.wrapError('update', error);
    return rowToCamel<TRow>(data) as TRow;
  }

  async delete(id: string, workshopId: string): Promise<void> {
    const { error } = await this.client.from(this.tableName).delete().eq('id', id).eq('workshop_id', workshopId);
    if (error) throw this.wrapError('delete', error);
  }

  private wrapError(operation: string, error: { message: string; code?: string }): AppError {
    return new AppError(
      ErrorCode.INTERNAL,
      `${this.tableName}.${operation} failed: ${error.message}`,
      500,
      { table: this.tableName, operation, dbErrorCode: error.code },
    );
  }
}
