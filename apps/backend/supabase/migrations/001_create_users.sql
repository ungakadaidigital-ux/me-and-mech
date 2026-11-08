-- 001_create_users.sql
-- Auth identity + role. id matches Supabase Auth's auth.users.id.
-- MVP has exactly one OWNER user per workshop; MECHANIC/VIEWER roles exist
-- now so PKG-020 (RBAC) and post-MVP multi-staff (Month 6 roadmap item)
-- don't require a schema change later.

CREATE TYPE user_role AS ENUM ('OWNER', 'MECHANIC', 'VIEWER');

CREATE TABLE users (
  id           UUID        PRIMARY KEY, -- = auth.users.id, no default (Supabase Auth issues it)
  workshop_id  UUID        NOT NULL, -- FK added in 002 after workshops exists (circular dep)
  phone        VARCHAR(15) NOT NULL UNIQUE,
  name         TEXT        NOT NULL,
  role         user_role   NOT NULL DEFAULT 'OWNER',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE users IS 'Auth identity + role. MVP: one OWNER per workshop. FK to workshops added in 002_create_workshops.sql to break circular dependency.';
