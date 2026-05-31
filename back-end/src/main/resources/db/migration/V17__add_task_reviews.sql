CREATE TABLE task_reviews (
    id BIGSERIAL PRIMARY KEY,
    task_id BIGINT NOT NULL REFERENCES tasks(id),
    reviewer_id BIGINT NOT NULL REFERENCES users(id),
    status_before VARCHAR(50) NOT NULL,
    status_after VARCHAR(50) NOT NULL,
    feedback TEXT NOT NULL,
    reviewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_task_reviews_task_reviewed
    ON task_reviews (task_id, reviewed_at DESC);
