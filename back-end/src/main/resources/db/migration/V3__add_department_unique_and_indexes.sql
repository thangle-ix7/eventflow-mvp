-- =============================================================================
-- V3: Add unique constraint on departments (event_id, name) and FK indexes
-- Prevents duplicate department names within the same event, which would
-- break dashboard aggregation (e.g. "Ban Truyền thông" counted twice).
-- =============================================================================

-- Unique constraint: department name must be unique within an event
ALTER TABLE departments
    ADD CONSTRAINT uq_departments_event_name UNIQUE (event_id, name);

-- Explicit FK indexes (PostgreSQL does not auto-index FKs; these speed up
-- JOIN queries in TaskRepository and DashboardRepository)
CREATE INDEX IF NOT EXISTS idx_tasks_event_id
    ON tasks (event_id);

CREATE INDEX IF NOT EXISTS idx_tasks_department_id
    ON tasks (department_id);

CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id
    ON tasks (assignee_id);

CREATE INDEX IF NOT EXISTS idx_tasks_event_status
    ON tasks (event_id, status);

CREATE INDEX IF NOT EXISTS idx_notif_user_id
    ON notifications (user_id);

CREATE INDEX IF NOT EXISTS idx_notif_task_id
    ON notifications (task_id);

CREATE INDEX IF NOT EXISTS idx_event_members_event_id
    ON event_members (event_id);

CREATE INDEX IF NOT EXISTS idx_event_members_user_id
    ON event_members (user_id);
