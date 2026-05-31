-- V5: Store one-time Telegram link tokens as hashes, not guessable user IDs.
ALTER TABLE users
    ADD COLUMN telegram_link_token_hash VARCHAR(64),
    ADD COLUMN telegram_link_token_expires_at TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_telegram_link_token_hash
    ON users (telegram_link_token_hash)
    WHERE telegram_link_token_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_telegram_link_token_expires_at
    ON users (telegram_link_token_expires_at)
    WHERE telegram_link_token_expires_at IS NOT NULL;
