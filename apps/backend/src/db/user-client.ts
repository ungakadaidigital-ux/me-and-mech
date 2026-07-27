import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env';

/**
 * PKG-011 — User-scoped client factory.
 *
 * Created fresh per request, using the caller's own JWT (anon key + user
 * token, never the service role key). Every query made through this client
 * is subject to RLS — this is the default, correct way for backend route
 * handlers to touch the database on a logged-in workshop's behalf.
 */
export function createUserScopedClient(userJwt: string): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${userJwt}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
