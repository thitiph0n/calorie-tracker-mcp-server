-- Migration: User Password Storage
-- Add password authentication for public OAuth flow

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS user_passwords (
  user_id TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_passwords_user_id ON user_passwords(user_id);
