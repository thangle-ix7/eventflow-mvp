-- =============================================================================
-- EventFlow System Role & Template Authorization
-- Version: V34
-- Scope: Add system_role to distinguish ADMIN (Template Manager) and USER
-- =============================================================================

-- Add system_role to users table for ADMIN/USER distinction
ALTER TABLE users ADD COLUMN system_role VARCHAR(20) NOT NULL DEFAULT 'USER';

-- Comment for documentation
COMMENT ON COLUMN users.system_role IS 'System role: ADMIN (can manage templates) or USER';
COMMENT ON COLUMN events.nature IS 'Event nature: TEMPLATE (reusable blueprint) or NORMAL (actual event)';