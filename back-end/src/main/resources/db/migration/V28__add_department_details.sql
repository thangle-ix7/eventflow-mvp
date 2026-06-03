ALTER TABLE departments
    ADD COLUMN description TEXT,
    ADD COLUMN leader_user_id BIGINT;

ALTER TABLE departments
    ADD CONSTRAINT fk_departments_leader_user
        FOREIGN KEY (leader_user_id) REFERENCES users(id);

CREATE INDEX idx_departments_leader_user_id ON departments(leader_user_id);
