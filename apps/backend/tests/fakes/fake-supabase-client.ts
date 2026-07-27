import { randomUUID } from 'node:crypto';

/**
 * PKG-029 test harness. This is NOT a PostgREST reimplementation — it
 * supports exactly the operations our repositories actually call
 * (.eq/.gte/.ilike/.order/.range/.select/.insert/.update/.delete/.single/
 * .maybeSingle/.rpc), enough to run the real service+repository code
 * against real logic with fake persistence. It does NOT verify RLS, DB
 * constraints/triggers, or SQL-level behavior (unique violations, CHECK
 * constraints) — those require a live Supabase project, which is exactly
 * why PKG-055's staging integration pass still exists. What this DOES
 * verify: that the service-layer business logic (state machines, dup
 * detection, invoice numbering sequencing) is correct against realistic
 * data flow.
 */

type Row = Record<string, any>;

function matchesFilters(row: Row, filters: Array<{ type: string; column: string; value: any }>): boolean {
  return filters.every((f) => {
    const rowVal = row[f.column];
    switch (f.type) {
      case 'eq':
        return rowVal === f.value;
      case 'neq':
        return rowVal !== f.value;
      case 'gte':
        return rowVal >= f.value;
      case 'lte':
        return rowVal <= f.value;
      case 'is':
        return f.value === null ? rowVal === null || rowVal === undefined : rowVal === f.value;
      case 'ilike': {
        const pattern = String(f.value).replace(/%/g, '.*');
        return new RegExp(`^${pattern}$`, 'i').test(String(rowVal ?? ''));
      }
      default:
        return true;
    }
  });
}

class FakeQueryBuilder {
  private filters: Array<{ type: string; column: string; value: any }> = [];
  private op: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private payload: Row | undefined;
  private wantSingle = false;
  private wantMaybeSingle = false;
  private wantCount = false;
  private orderCol?: string;
  private orderAsc = true;
  private rangeFrom?: number;
  private rangeTo?: number;

  constructor(
    private readonly table: Row[],
    private readonly onMutate: () => void,
  ) {}

  select(_columns?: string, opts?: { count?: 'exact' }) {
    if (opts?.count === 'exact') this.wantCount = true;
    return this;
  }
  insert(payload: Row) {
    this.op = 'insert';
    this.payload = { id: randomUUID(), created_at: new Date().toISOString(), ...payload };
    return this;
  }
  update(payload: Row) {
    this.op = 'update';
    this.payload = payload;
    return this;
  }
  delete() {
    this.op = 'delete';
    return this;
  }
  eq(column: string, value: any) {
    this.filters.push({ type: 'eq', column, value });
    return this;
  }
  neq(column: string, value: any) {
    this.filters.push({ type: 'neq', column, value });
    return this;
  }
  gte(column: string, value: any) {
    this.filters.push({ type: 'gte', column, value });
    return this;
  }
  lte(column: string, value: any) {
    this.filters.push({ type: 'lte', column, value });
    return this;
  }
  is(column: string, value: any) {
    this.filters.push({ type: 'is', column, value });
    return this;
  }
  ilike(column: string, value: any) {
    this.filters.push({ type: 'ilike', column, value });
    return this;
  }
  order(column: string, opts?: { ascending?: boolean }) {
    this.orderCol = column;
    this.orderAsc = opts?.ascending ?? true;
    return this;
  }
  range(from: number, to: number) {
    this.rangeFrom = from;
    this.rangeTo = to;
    return this;
  }
  single() {
    this.wantSingle = true;
    return this.execute();
  }
  maybeSingle() {
    this.wantMaybeSingle = true;
    return this.execute();
  }

  private async execute(): Promise<{ data: any; error: any; count?: number }> {
    try {
      if (this.op === 'insert') {
        this.table.push(this.payload!);
        this.onMutate();
        return { data: this.wantSingle || this.wantMaybeSingle ? this.payload : [this.payload], error: null };
      }

      if (this.op === 'update') {
        const matches = this.table.filter((r) => matchesFilters(r, this.filters));
        matches.forEach((r) => Object.assign(r, this.payload));
        this.onMutate();
        const result = this.wantSingle || this.wantMaybeSingle ? matches[0] ?? null : matches;
        return { data: result, error: null };
      }

      if (this.op === 'delete') {
        const remaining = this.table.filter((r) => !matchesFilters(r, this.filters));
        const removedCount = this.table.length - remaining.length;
        this.table.length = 0;
        this.table.push(...remaining);
        this.onMutate();
        return { data: null, error: null, count: removedCount };
      }

      // select
      let matches = this.table.filter((r) => matchesFilters(r, this.filters));
      const count = matches.length;
      if (this.orderCol) {
        matches = [...matches].sort((a, b) => {
          const av = a[this.orderCol!];
          const bv = b[this.orderCol!];
          return this.orderAsc ? (av > bv ? 1 : -1) : av < bv ? 1 : -1;
        });
      }
      if (this.rangeFrom !== undefined && this.rangeTo !== undefined) {
        matches = matches.slice(this.rangeFrom, this.rangeTo + 1);
      }
      if (this.wantSingle) {
        return { data: matches[0] ?? null, error: matches[0] ? null : { message: 'No rows found', code: 'PGRST116' } };
      }
      if (this.wantMaybeSingle) {
        return { data: matches[0] ?? null, error: null };
      }
      return { data: matches, error: null, count: this.wantCount ? count : undefined };
    } catch (err) {
      return { data: null, error: { message: (err as Error).message } };
    }
  }

  // Makes `await builder` work for list queries with no .single()/.maybeSingle() call
  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled as any, onrejected as any);
  }
}

export class FakeSupabaseClient {
  private tables = new Map<string, Row[]>();
  private rpcHandlers = new Map<string, (args: Record<string, unknown>) => any>();
  public mutationCount = 0;

  private getTable(name: string): Row[] {
    if (!this.tables.has(name)) this.tables.set(name, []);
    return this.tables.get(name)!;
  }

  /** Test setup helper — seed a table directly. */
  seed(table: string, rows: Row[]) {
    this.getTable(table).push(...rows);
  }

  dump(table: string): Row[] {
    return this.getTable(table);
  }

  registerRpc(name: string, handler: (args: Record<string, unknown>) => any) {
    this.rpcHandlers.set(name, handler);
  }

  from(table: string) {
    return new FakeQueryBuilder(this.getTable(table), () => {
      this.mutationCount += 1;
    });
  }

  async rpc(name: string, args: Record<string, unknown>) {
    const handler = this.rpcHandlers.get(name);
    if (!handler) return { data: null, error: { message: `No fake handler registered for rpc "${name}"` } };
    try {
      const data = await handler(args);
      return { data, error: null };
    } catch (err) {
      return { data: null, error: { message: (err as Error).message, code: (err as any).code } };
    }
  }
}
