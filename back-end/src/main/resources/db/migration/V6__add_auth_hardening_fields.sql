-- V6: Email verification, password reset, and account lockout support.
ALTER TABLE users
    ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN email_verification_token_hash VARCHAR(64),
    ADD COLUMN email_verification_token_expires_at TIMESTAMP,
    ADD COLUMN password_reset_token_hash VARCHAR(64),
    ADD COLUMN password_reset_token_expires_at TIMESTAMP,
    ADD COLUMN failed_login_attempts INT NOT NULL DEFAULT 0,
    ADD COLUMN locked_until TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_verification_token_hash
    ON users (email_verification_token_hash)
    WHERE email_verification_token_hash IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_password_reset_token_hash
    ON users (password_reset_token_hash)
    WHERE password_reset_token_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_locked_until
    ON users (locked_until)
    WHERE locked_until IS NOT NULL;
