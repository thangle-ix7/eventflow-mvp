ALTER TABLE event_attendees
    ADD COLUMN IF NOT EXISTS invite_code VARCHAR(16);

UPDATE event_attendees
SET invite_code = upper(substr(md5(coalesce(qr_token, '') || id::text), 1, 10))
WHERE invite_code IS NULL;

ALTER TABLE event_attendees
    ALTER COLUMN invite_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_event_attendees_invite_code ON event_attendees(invite_code);

ALTER TABLE check_in_records
    DROP CONSTRAINT IF EXISTS chk_check_in_records_method;

ALTER TABLE check_in_records
    ADD CONSTRAINT chk_check_in_records_method
        CHECK (method IN ('QR', 'MANUAL', 'INVITE_CODE'));
