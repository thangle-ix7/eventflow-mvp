ALTER TABLE events
    ADD COLUMN IF NOT EXISTS end_time TIMESTAMP;

UPDATE events
SET end_time = event_date
WHERE end_time IS NULL;
