ALTER TABLE notifications
    ADD COLUMN IF NOT EXISTS read_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_notif_user_unread
    ON notifications (user_id, read_at, created_at DESC)
    WHERE read_at IS NULL;
