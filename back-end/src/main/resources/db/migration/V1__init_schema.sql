-- =============================================================================
-- EventFlow Database Initialization Schema
-- Version: V1
-- Description: Initial schema setup including ENUMs, Tables, and Indexes
-- =============================================================================

-- 1. Create Custom ENUM Types
CREATE TYPE user_role AS ENUM ('LEADER', 'MEMBER');
CREATE TYPE task_status AS ENUM ('TODO', 'IN_PROGRESS', 'DONE');
CREATE TYPE noti_channel AS ENUM ('TELEGRAM', 'EMAIL', 'ZALO');
CREATE TYPE noti_type AS ENUM ('UPCOMING', 'OVERDUE');
CREATE TYPE noti_status AS ENUM ('PENDING', 'SENT', 'FAILED');

-- 2. Create Tables

-- Users table: Stores basic user information
CREATE TABLE users (
 id BIGSERIAL PRIMARY KEY,
 name VARCHAR(100) NOT NULL,
 email VARCHAR(100) UNIQUE NOT NULL,
 phone_number VARCHAR(15),
 telegram_chat_id VARCHAR(50) DEFAULT NULL,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Events table: Stores event details
CREATE TABLE events (
 id BIGSERIAL PRIMARY KEY,
 name VARCHAR(255) NOT NULL,
 event_date TIMESTAMP NOT NULL,
 status VARCHAR(50) DEFAULT 'ACTIVE',
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Event Members table: Maps users to events with specific roles (Domain Logic: Role is event-specific)
CREATE TABLE event_members (
 id BIGSERIAL PRIMARY KEY,
 event_id BIGINT REFERENCES events(id) ON DELETE CASCADE,
 user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
 role user_role NOT NULL DEFAULT 'MEMBER',
 joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT uq_event_member UNIQUE(event_id, user_id)
);

-- Departments table: Organizational units within an event
CREATE TABLE departments (
 id BIGSERIAL PRIMARY KEY,
 event_id BIGINT REFERENCES events(id) ON DELETE CASCADE,
 name VARCHAR(100) NOT NULL
);

-- Tasks table: Task management for events and departments
CREATE TABLE tasks (
 id BIGSERIAL PRIMARY KEY,
 event_id BIGINT REFERENCES events(id) ON DELETE CASCADE,
 department_id BIGINT REFERENCES departments(id) ON DELETE CASCADE,
 assignee_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
 title VARCHAR(255) NOT NULL,
 status task_status NOT NULL DEFAULT 'TODO',
 deadline TIMESTAMP NOT NULL,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications table: Tracking auto-reminders
CREATE TABLE notifications (
 id BIGSERIAL PRIMARY KEY,
 user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
 task_id BIGINT REFERENCES tasks(id) ON DELETE CASCADE,
 channel noti_channel NOT NULL,
 type noti_type NOT NULL,
 status noti_status NOT NULL DEFAULT 'PENDING',
 retry_count INT DEFAULT 0,
 error_log TEXT,
 sent_at TIMESTAMP,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT uq_notif_user_task_type UNIQUE (user_id, task_id, type)
);

-- 3. Create Optimized Indexes

-- Index for faster event-based task retrieval
CREATE INDEX idx_tasks_event ON tasks(event_id);

-- Partial index for pending tasks approaching deadline (optimizes scheduler queries)
CREATE INDEX idx_tasks_deadline ON tasks(deadline) WHERE status != 'DONE';

-- Partial index for pending notifications (optimizes notification worker)
CREATE INDEX idx_notif_pending ON notifications(status) WHERE status = 'PENDING';

-- Composite index for notification uniqueness and lookup
CREATE INDEX idx_notif_user ON notifications(user_id, task_id, type);
