ALTER TABLE milestones
    DROP COLUMN IF EXISTS expected_result,
    DROP COLUMN IF EXISTS priority,
    DROP COLUMN IF EXISTS status;
