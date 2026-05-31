ALTER TABLE tasks
    ADD COLUMN progress_percentage INTEGER NOT NULL DEFAULT 0;

ALTER TABLE tasks
    ADD CONSTRAINT chk_tasks_progress_percentage
    CHECK (progress_percentage >= 0 AND progress_percentage <= 100);
