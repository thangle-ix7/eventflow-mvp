ALTER TABLE tasks
    ADD COLUMN parent_id BIGINT;

ALTER TABLE tasks
    ADD CONSTRAINT fk_tasks_parent
        FOREIGN KEY (parent_id)
        REFERENCES tasks(id)
        ON DELETE SET NULL;

CREATE INDEX idx_tasks_parent_id
    ON tasks(parent_id);
