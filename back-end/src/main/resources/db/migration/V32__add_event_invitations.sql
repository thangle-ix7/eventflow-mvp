CREATE TABLE event_invitations (
    id BIGSERIAL PRIMARY KEY,
    event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    invitee_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invited_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    email VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'MEMBER',
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP
);

CREATE UNIQUE INDEX uq_event_invitations_pending
    ON event_invitations(event_id, invitee_user_id)
    WHERE status = 'PENDING';

CREATE INDEX idx_event_invitations_event_status
    ON event_invitations(event_id, status);

CREATE INDEX idx_event_invitations_expires_at
    ON event_invitations(expires_at);
