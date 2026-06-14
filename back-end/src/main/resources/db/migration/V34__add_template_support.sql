-- Add system_role to users table for ADMIN/USER distinction
ALTER TABLE users ADD COLUMN system_role VARCHAR(20) NOT NULL DEFAULT 'USER';

-- Add nature to events table for TEMPLATE/NORMAL distinction
ALTER TABLE events ADD COLUMN nature VARCHAR(20) NOT NULL DEFAULT 'NORMAL';

-- Add context fields to events table (useful for templates)
ALTER TABLE events ADD COLUMN context_description TEXT;
ALTER TABLE events ADD COLUMN objective TEXT;
ALTER TABLE events ADD COLUMN expected_attendees INTEGER;
ALTER TABLE events ADD COLUMN scale VARCHAR(100);

-- Create index for faster template queries
CREATE INDEX idx_events_nature ON events(nature);

-- Comment
COMMENT ON COLUMN users.system_role IS 'System role: ADMIN (can manage templates) or USER';
COMMENT ON COLUMN events.nature IS 'Event nature: TEMPLATE (reusable blueprint) or NORMAL (actual event)';
