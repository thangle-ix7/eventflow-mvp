CREATE TABLE calendar_event (
    id BIGSERIAL PRIMARY KEY,
    event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    department_id BIGINT REFERENCES departments(id) ON DELETE SET NULL,
    created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(300) NOT NULL,
    description TEXT,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    all_day BOOLEAN NOT NULL DEFAULT FALSE,
    type VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
    location VARCHAR(255),
    meeting_url TEXT,
    meeting_options JSONB,
    recurrence_rule TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_ce_event ON calendar_event(event_id);
CREATE INDEX idx_ce_time ON calendar_event(start_time, end_time);
CREATE INDEX idx_ce_department ON calendar_event(department_id);
CREATE INDEX idx_ce_creator ON calendar_event(created_by);
