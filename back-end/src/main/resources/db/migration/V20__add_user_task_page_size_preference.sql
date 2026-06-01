ALTER TABLE users
    ADD COLUMN task_page_size INT NOT NULL DEFAULT 10;

ALTER TABLE users
    ADD CONSTRAINT chk_users_task_page_size
        CHECK (task_page_size >= 1 AND task_page_size <= 100);
