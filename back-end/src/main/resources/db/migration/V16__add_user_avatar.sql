ALTER TABLE users
    ADD COLUMN avatar_original_name VARCHAR(255),
    ADD COLUMN avatar_content_type VARCHAR(100),
    ADD COLUMN avatar_size_bytes BIGINT,
    ADD COLUMN avatar_storage_provider VARCHAR(20),
    ADD COLUMN avatar_storage_path VARCHAR(500);
