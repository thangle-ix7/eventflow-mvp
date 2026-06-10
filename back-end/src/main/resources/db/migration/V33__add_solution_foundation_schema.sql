-- =============================================================================
-- EventFlow Solution Foundation Schema
-- Version: V33
-- Scope:
--   1. Event Template foundation
--   2. AI Planning / Milestone foundation
--   3. Workload Score foundation
-- =============================================================================

-- Event Template: distinguish reusable template records from runnable events.
ALTER TABLE events
    ADD COLUMN nature VARCHAR(20) NOT NULL DEFAULT 'NORMAL';

ALTER TABLE events
    ADD CONSTRAINT chk_events_nature
        CHECK (nature IN ('NORMAL', 'TEMPLATE'));

CREATE INDEX idx_events_nature ON events(nature);

-- AI Suggestion context: optional metadata used to improve planning prompts.
ALTER TABLE events
    ADD COLUMN context_description TEXT,
    ADD COLUMN objective TEXT,
    ADD COLUMN expected_attendees INTEGER,
    ADD COLUMN scale VARCHAR(100);

-- Event Template: template tasks may intentionally omit deadline. A real event
-- can still enforce deadline at service/API level when the workflow requires it.
ALTER TABLE tasks
    ALTER COLUMN deadline DROP NOT NULL;

-- Task Category: reusable categories inside one event/template.
CREATE TABLE task_categories (
    id BIGSERIAL PRIMARY KEY,
    event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_task_categories_event_name UNIQUE (event_id, name)
);

CREATE INDEX idx_task_categories_event_id ON task_categories(event_id);

-- AI Planning: high-level plans and phases for event execution.
CREATE TABLE plannings (
    id BIGSERIAL PRIMARY KEY,
    event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_plannings_event_id ON plannings(event_id);

CREATE TABLE planning_phases (
    id BIGSERIAL PRIMARY KEY,
    planning_id BIGINT NOT NULL REFERENCES plannings(id) ON DELETE CASCADE,
    phase_name VARCHAR(255) NOT NULL,
    description TEXT,
    objective TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_planning_phases_planning_id ON planning_phases(planning_id);

CREATE TABLE milestones (
    id BIGSERIAL PRIMARY KEY,
    event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    expected_deadline TIMESTAMP,
    expected_result TEXT,
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    status VARCHAR(50) NOT NULL DEFAULT 'TODO',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_milestones_priority
        CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    CONSTRAINT chk_milestones_status
        CHECK (status IN ('TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED'))
);

CREATE INDEX idx_milestones_event_id ON milestones(event_id);
CREATE INDEX idx_milestones_status ON milestones(status);

-- Link task to category and milestone. Both are optional to keep template and
-- event workflows flexible.
ALTER TABLE tasks
    ADD COLUMN category_id BIGINT REFERENCES task_categories(id) ON DELETE SET NULL,
    ADD COLUMN milestone_id BIGINT REFERENCES milestones(id) ON DELETE SET NULL;

CREATE INDEX idx_tasks_category_id ON tasks(category_id);
CREATE INDEX idx_tasks_milestone_id ON tasks(milestone_id);

-- Workload Score: no hard capacity/limit is stored in MVP. Scores are computed
-- at read time from assigned tasks so leaders can rebalance work, not block
-- assignment through a max threshold.
