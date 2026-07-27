import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env';

/**
 * PKG-011 — Admin client (service role key).
 *
 * SECURITY RULE: this client bypasses RLS entirely. Use it ONLY for
 * operations that are explicitly designed to run outside a user's
 * permission scope — Edge Functions, webhook handlers, scheduled workers,
 * and the specific onboarding/registration flows that must write before a
 * user session fully exists.
 *
 * NEVER import this into a route handler that serves a plain authenticated
 * request on behalf of a logged-in workshop — use createUserScopedClient()
 * (user-client.ts) for that, so RLS stays the enforcement boundary it's
 * meant to be, not something route code has to remember to re-implement.
 *
 * NEVER ship this key, or a client built from it, to the mobile app.
 */
let _adminClient: SupabaseClient | null = null;

export function getAdminClient(): SupabaseClient {
  if (!_adminClient) {
    _adminClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _adminClient;
}
