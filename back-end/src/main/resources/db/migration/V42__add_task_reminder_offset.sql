ALTER TABLE tasks
    ADD COLUMN IF NOT EXISTS reminder_offset_minutes INTEGER NOT NULL DEFAULT 1440;

CREATE INDEX IF NOT EXISTS idx_tasks_active_deadline
    ON tasks (status, deadline)
    WHERE status <> 'DONE';
