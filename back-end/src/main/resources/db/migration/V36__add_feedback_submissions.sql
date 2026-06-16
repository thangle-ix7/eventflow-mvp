CREATE TABLE feedback_submissions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    event_id BIGINT REFERENCES events(id) ON DELETE SET NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'GENERAL',
    message TEXT NOT NULL,
    is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
    public_visible BOOLEAN NOT NULL DEFAULT FALSE,
    contact_email VARCHAR(100),
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
    response_message TEXT,
    responded_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    responded_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_feedback_status
        CHECK (status IN ('OPEN', 'REVIEWING', 'RESPONDED', 'CLOSED'))
);

CREATE INDEX idx_feedback_event_id ON feedback_submissions(event_id);
CREATE INDEX idx_feedback_user_id ON feedback_submissions(user_id);
CREATE INDEX idx_feedback_status_created_at ON feedback_submissions(status, created_at DESC);
CREATE INDEX idx_feedback_public_visible ON feedback_submissions(public_visible);
