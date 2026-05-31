CREATE TABLE task_reports (
    id BIGSERIAL PRIMARY KEY,
    task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    reporter_id BIGINT NOT NULL REFERENCES users(id),
    progress_percentage INTEGER NOT NULL,
    description TEXT NOT NULL,
    image_original_name VARCHAR(255),
    image_content_type VARCHAR(100),
    image_storage_path VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_task_reports_progress_percentage
        CHECK (progress_percentage >= 0 AND progress_percentage <= 100)
);

CREATE INDEX idx_task_reports_task_id_created_at
    ON task_reports(task_id, created_at DESC);

CREATE INDEX idx_task_reports_reporter_id
    ON task_reports(reporter_id);
