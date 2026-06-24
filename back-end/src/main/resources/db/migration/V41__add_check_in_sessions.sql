CREATE TABLE check_in_sessions (
    id BIGSERIAL PRIMARY KEY,
    event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    starts_at TIMESTAMP,
    ends_at TIMESTAMP,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_check_in_sessions_event_id ON check_in_sessions(event_id);
CREATE INDEX idx_check_in_sessions_event_active ON check_in_sessions(event_id, active);

ALTER TABLE event_attendees
    ADD COLUMN session_id BIGINT REFERENCES check_in_sessions(id) ON DELETE SET NULL;

CREATE INDEX idx_event_attendees_session_id ON event_attendees(session_id);
CREATE INDEX idx_event_attendees_event_session_status ON event_attendees(event_id, session_id, status);

ALTER TABLE check_in_records
    ADD COLUMN session_id BIGINT REFERENCES check_in_sessions(id) ON DELETE SET NULL;

CREATE INDEX idx_check_in_records_session_id ON check_in_records(session_id);