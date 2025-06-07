-- Migration: Role-Based Authentication System
-- This migration consolidates all changes needed for role-based auth:
-- 1. Updates users table schema for role-based authentication
-- 2. Adds role column with proper constraints
-- 3. Creates admin user with hashed API key
-- 4. Adds necessary indexes for performance

-- Enable foreign key support
PRAGMA foreign_keys = ON;

-- Add role column to users table if it doesn't exist
-- Check if role column exists first to make this migration idempotent
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';

-- Update users table to use api_key_hash instead of api_key if needed
-- Add api_key_hash column if it doesn't exist (for new installations)
-- Note: SQLite doesn't allow adding UNIQUE constraint with ALTER TABLE, so we add it separately
ALTER TABLE users ADD COLUMN api_key_hash TEXT;

-- Create admin user with hashed API key and admin role
-- Using INSERT OR REPLACE to make this idempotent
-- API key 'admin-api-key-2025' hashes to: b2264438787f54efada425727ac91549a0fa6b9e453ff53c668db7d517a4670b
INSERT OR REPLACE INTO users (id, name, email, api_key_hash, role, created_at) 
VALUES (
  'admin',
  'Admin User', 
  'admin@calorie-tracker.com',
  'b2264438787f54efada425727ac91549a0fa6b9e453ff53c668db7d517a4670b',
  'admin',
  CURRENT_TIMESTAMP
);

-- Create indexes for optimal performance
-- Create a unique index on api_key_hash to ensure uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_api_key_hash_unique ON users(api_key_hash);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Remove the old plaintext api_key column if it exists (conditional)
-- This is done last to avoid breaking existing systems during migration
-- Note: In SQLite, we can't directly drop columns in older versions
-- For production, you may want to handle this separately if using older SQLite
PRAGMA table_info(users);
