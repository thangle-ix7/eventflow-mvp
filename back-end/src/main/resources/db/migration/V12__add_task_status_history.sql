-- Track task status changes so dashboards can chart status updates by day.
CREATE TABLE task_status_history (
    id BIGSERIAL PRIMARY KEY,
    task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    department_id BIGINT REFERENCES departments(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL,
    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_task_status_history_event_changed
    ON task_status_history (event_id, changed_at);

CREATE INDEX IF NOT EXISTS idx_task_status_history_department_changed
    ON task_status_history (department_id, changed_at);

CREATE INDEX IF NOT EXISTS idx_task_status_history_task_changed
    ON task_status_history (task_id, changed_at DESC);

-- Existing tasks did not have history before this migration. Seed one point per task
-- at created_at so charts have a meaningful baseline after upgrade.
INSERT INTO task_status_history (task_id, event_id, department_id, status, changed_at)
SELECT id, event_id, department_id, status, COALESCE(created_at, CURRENT_TIMESTAMP)
FROM tasks;
