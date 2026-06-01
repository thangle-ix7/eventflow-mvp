DO $$
BEGIN
    IF to_regclass('event_calendar_items') IS NOT NULL AND to_regclass('calendar_event') IS NULL THEN
        ALTER TABLE event_calendar_items RENAME TO calendar_event;
    END IF;
END $$;

ALTER TABLE calendar_event
    ADD COLUMN IF NOT EXISTS department_id BIGINT REFERENCES departments(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS all_day BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
    ADD COLUMN IF NOT EXISTS meeting_url TEXT,
    ADD COLUMN IF NOT EXISTS meeting_options JSONB,
    ADD COLUMN IF NOT EXISTS recurrence_rule TEXT,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

UPDATE calendar_event
SET end_time = start_time
WHERE end_time IS NULL;

ALTER TABLE calendar_event
    ALTER COLUMN end_time SET NOT NULL;

ALTER TABLE calendar_event
    ALTER COLUMN title TYPE VARCHAR(300);

DROP INDEX IF EXISTS idx_event_calendar_items_event_start;
CREATE INDEX IF NOT EXISTS idx_ce_event ON calendar_event(event_id);
CREATE INDEX IF NOT EXISTS idx_ce_time ON calendar_event(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_ce_department ON calendar_event(department_id);
CREATE INDEX IF NOT EXISTS idx_ce_creator ON calendar_event(created_by);
