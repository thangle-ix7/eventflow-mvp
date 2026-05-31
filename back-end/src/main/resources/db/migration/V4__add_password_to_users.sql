-- V4: Add password column to users table (required for auth flow)
ALTER TABLE users
    ADD COLUMN password VARCHAR(68) NOT NULL DEFAULT '';

-- Remove the default after adding (passwords will be set via signup)
ALTER TABLE users
    ALTER COLUMN password DROP DEFAULT;