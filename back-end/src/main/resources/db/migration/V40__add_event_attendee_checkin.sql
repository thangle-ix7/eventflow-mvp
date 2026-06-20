CREATE TABLE event_attendees (
    id BIGSERIAL PRIMARY KEY,
    event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(150),
    phone VARCHAR(30),
    attendee_type VARCHAR(30) NOT NULL DEFAULT 'GUEST',
    status VARCHAR(30) NOT NULL DEFAULT 'INVITED',
    qr_token VARCHAR(64) NOT NULL UNIQUE,
    note TEXT,
    checked_in_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_event_attendees_type
        CHECK (attendee_type IN ('GUEST', 'VIP', 'SPEAKER', 'SPONSOR', 'STAFF')),
    CONSTRAINT chk_event_attendees_status
        CHECK (status IN ('INVITED', 'CONFIRMED', 'CHECKED_IN', 'NO_SHOW'))
);

CREATE INDEX idx_event_attendees_event_id ON event_attendees(event_id);
CREATE INDEX idx_event_attendees_event_status ON event_attendees(event_id, status);
CREATE INDEX idx_event_attendees_qr_token ON event_attendees(qr_token);

CREATE TABLE check_in_records (
    id BIGSERIAL PRIMARY KEY,
    event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    attendee_id BIGINT NOT NULL REFERENCES event_attendees(id) ON DELETE CASCADE,
    checked_in_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    checked_in_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    method VARCHAR(30) NOT NULL DEFAULT 'QR',
    note TEXT,
    CONSTRAINT chk_check_in_records_method
        CHECK (method IN ('QR', 'MANUAL'))
);

CREATE INDEX idx_check_in_records_event_id ON check_in_records(event_id);
CREATE INDEX idx_check_in_records_attendee_id ON check_in_records(attendee_id);
