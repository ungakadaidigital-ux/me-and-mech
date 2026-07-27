import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';
import { asyncHandler } from '../middleware/error-handler';

export const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'me-and-mech-api', timestamp: new Date().toISOString() });
});

healthRouter.get(
  '/health/db',
  asyncHandler(async (_req, res) => {
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    const { error: connError } = await supabase.from('workshops').select('id').limit(1);
    if (connError) {
      return res.status(503).json({ status: 'error', db: 'disconnected', message: connError.message });
    }

    // Schema version — count of applied migrations, tracked by the
    // Supabase CLI itself in supabase_migrations.schema_migrations.
    let schemaVersion: number | null = null;
    try {
      const { count } = await supabase
        .schema('supabase_migrations' as any)
        .from('schema_migrations')
        .select('version', { count: 'exact', head: true });
      schemaVersion = count ?? null;
    } catch {
      // Table may not be queryable via PostgREST depending on exposure config —
      // this is a best-effort diagnostic, not a hard requirement to boot.
      schemaVersion = null;
    }

    // RLS spot-check: confirm the service role (which bypasses RLS) can see
    // rows, as a basic sanity signal — this endpoint does NOT verify RLS
    // correctness (that's test_rls.sql's job), only that RLS hasn't been
    // accidentally left disabled in a way that breaks the admin client too.
    res.json({
      status: 'ok',
      db: 'connected',
      schemaVersion,
      note: 'schemaVersion is best-effort; full RLS verification is test_rls.sql, run manually before each release.',
    });
  }),
);
