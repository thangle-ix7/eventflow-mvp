ALTER TABLE users
  ADD COLUMN IF NOT EXISTS consent_version VARCHAR(40),
  ADD COLUMN IF NOT EXISTS consent_accepted_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS personal_data_deleted_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_users_personal_data_deleted_at
  ON users(personal_data_deleted_at);
