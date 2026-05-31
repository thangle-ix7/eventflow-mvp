-- =============================================================================
-- V2: Convert ENUM columns to VARCHAR for Hibernate 6 compatibility
-- Hibernate 6 bind enum parameters as VARCHAR; PostgreSQL ENUM requires explicit
-- casts that are not produced by default, causing SQLGrammarException.
-- This migration keeps the existing data and changes column types to VARCHAR.
-- =============================================================================

-- Drop indexes that reference ENUM-typed columns before conversion.
-- PostgreSQL cannot re-evaluate partial index predicates when the column
-- type changes unless all referenced types are compatible.
DROP INDEX IF EXISTS idx_tasks_deadline;
DROP INDEX IF EXISTS idx_notif_pending;

-- Break the dependency between each ENUM-typed column and its type by
-- removing the default first; otherwise PostgreSQL refuses to DROP TYPE.
ALTER TABLE tasks         ALTER COLUMN status  DROP DEFAULT;
ALTER TABLE notifications ALTER COLUMN channel DROP DEFAULT;
ALTER TABLE notifications ALTER COLUMN type    DROP DEFAULT;
ALTER TABLE notifications ALTER COLUMN status  DROP DEFAULT;
ALTER TABLE event_members ALTER COLUMN role    DROP DEFAULT;

-- Tasks.status: task_status -> VARCHAR(20)
ALTER TABLE tasks
  ALTER COLUMN status TYPE VARCHAR(20)
  USING status::text;
ALTER TABLE tasks
  ALTER COLUMN status SET DEFAULT 'TODO';

-- Notifications: ENUM columns -> VARCHAR(20)
ALTER TABLE notifications
  ALTER COLUMN channel TYPE VARCHAR(20)
  USING channel::text,
  ALTER COLUMN type    TYPE VARCHAR(20)
  USING type::text,
  ALTER COLUMN status  TYPE VARCHAR(20)
  USING status::text;
ALTER TABLE notifications
  ALTER COLUMN status SET DEFAULT 'PENDING';

-- EventMembers.role: user_role -> VARCHAR(20)
ALTER TABLE event_members
  ALTER COLUMN role TYPE VARCHAR(20)
  USING role::text;
ALTER TABLE event_members
  ALTER COLUMN role SET DEFAULT 'MEMBER';

-- Drop the now-unused ENUM types
DROP TYPE IF EXISTS noti_status;
DROP TYPE IF EXISTS noti_type;
DROP TYPE IF EXISTS noti_channel;
DROP TYPE IF EXISTS task_status;
DROP TYPE IF EXISTS user_role;

-- Recreate indexes after column types are VARCHAR
CREATE INDEX idx_tasks_deadline ON tasks(deadline) WHERE status != 'DONE';
CREATE INDEX idx_notif_pending ON notifications(status) WHERE status = 'PENDING';
