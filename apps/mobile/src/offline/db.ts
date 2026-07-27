import * as SQLite from 'expo-sqlite';

/**
 * PKG-040 — Offline Sync System, built on Expo SQLite (locked tech
 * decision — not WatermelonDB, for faster MVP delivery per PKG-037).
 *
 * Two concerns, two kinds of table:
 *   - `sync_queue`: mutations made while offline, replayed in order once
 *     connectivity returns. This is the source of truth for "what still
 *     needs to reach the server."
 *   - `cache_*` tables: a read-through local mirror of customers/vehicles/
 *     job_cards, so the app has something to show immediately on cold
 *     start before the network round-trip completes, and so the mechanic
 *     can keep working (creating job cards against cached customers/
 *     vehicles) while fully offline.
 */

let dbInstance: SQLite.SQLiteDatabase | null = null;

export function getDb(): SQLite.SQLiteDatabase {
  if (!dbInstance) {
    dbInstance = SQLite.openDatabaseSync('me_and_mech.db');
  }
  return dbInstance;
}

export function initOfflineDb() {
  const db = getDb();
  db.execSync(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      operation TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT
    );

    CREATE TABLE IF NOT EXISTS cache_customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      city TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cache_vehicles (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      vehicle_number TEXT NOT NULL,
      make TEXT,
      model TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cache_job_cards (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      vehicle_id TEXT NOT NULL,
      status TEXT NOT NULL,
      job_type TEXT NOT NULL,
      items_json TEXT NOT NULL,
      is_local_only INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );
  `);
}
