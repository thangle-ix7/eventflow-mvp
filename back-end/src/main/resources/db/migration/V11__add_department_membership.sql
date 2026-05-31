-- Allow event members to be assigned to one department within the event.
ALTER TABLE event_members
    ADD COLUMN department_id BIGINT REFERENCES departments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_event_members_department_id
    ON event_members (department_id);

CREATE INDEX IF NOT EXISTS idx_event_members_event_department
    ON event_members (event_id, department_id);
