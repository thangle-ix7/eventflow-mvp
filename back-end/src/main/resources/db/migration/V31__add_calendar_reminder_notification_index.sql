CREATE UNIQUE INDEX IF NOT EXISTS uq_notif_user_calendar_reminder
    ON notifications (user_id, calendar_event_id, type)
    WHERE calendar_event_id IS NOT NULL
      AND type IN ('CALENDAR_REMINDER_TOMORROW', 'CALENDAR_REMINDER_SOON');
