CREATE TABLE IF NOT EXISTS calendar_event_attendees (
    id BIGSERIAL PRIMARY KEY,
    calendar_event_id BIGINT NOT NULL REFERENCES calendar_event(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_calendar_event_attendee UNIQUE (calendar_event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_cea_calendar_event
    ON calendar_event_attendees(calendar_event_id);

CREATE INDEX IF NOT EXISTS idx_cea_user
    ON calendar_event_attendees(user_id);
