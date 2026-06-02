ALTER TABLE notifications
    ALTER COLUMN task_id DROP NOT NULL,
    ADD COLUMN IF NOT EXISTS event_id BIGINT REFERENCES events(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS calendar_event_id BIGINT REFERENCES calendar_event(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS title VARCHAR(300),
    ADD COLUMN IF NOT EXISTS message TEXT;

ALTER TABLE notifications
    DROP CONSTRAINT IF EXISTS uq_notif_user_task_type;

CREATE UNIQUE INDEX IF NOT EXISTS uq_notif_user_task_reminder_type
    ON notifications (user_id, task_id, type)
    WHERE task_id IS NOT NULL
      AND type IN ('UPCOMING', 'OVERDUE');

CREATE UNIQUE INDEX IF NOT EXISTS uq_notif_user_calendar_invite
    ON notifications (user_id, calendar_event_id, type)
    WHERE calendar_event_id IS NOT NULL
      AND type = 'CALENDAR_INVITE';

CREATE INDEX IF NOT EXISTS idx_notif_calendar_event
    ON notifications (calendar_event_id)
    WHERE calendar_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notif_event
    ON notifications (event_id)
    WHERE event_id IS NOT NULL;
