ALTER TABLE task_reports
    ADD COLUMN IF NOT EXISTS image_size_bytes BIGINT,
    ADD COLUMN IF NOT EXISTS image_storage_provider VARCHAR(50);
