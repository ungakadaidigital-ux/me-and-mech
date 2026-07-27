import { execSync } from 'node:child_process';

/**
 * PKG-015 — Migration Runner.
 *
 * Migrations are applied via the Supabase CLI ONLY — this script is a thin,
 * CI/deploy-friendly wrapper around it, not a reimplementation. Never
 * modify schema manually against a running database; every change must be
 * a new numbered file under supabase/migrations/.
 *
 * Usage:
 *   npm run migrate --workspace=apps/backend            # push to linked project
 *   npm run migrate --workspace=apps/backend -- --dry-run
 *
 * Requires: `supabase` CLI installed, and `supabase link` already run
 * against the target project (this script does not manage linking/auth —
 * that's a one-time setup step per environment, done by the agency).
 */

const isDryRun = process.argv.includes('--dry-run');

function run(cmd: string) {
  console.log(`$ ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
}

try {
  if (isDryRun) {
    run('supabase db diff --linked');
  } else {
    run('supabase db push');
  }
  console.log('✅ Migrations applied.');
} catch (err) {
  console.error('❌ Migration run failed. Do not proceed to deploy the API against this database state.');
  process.exit(1);
}
