-- Migration: User Profile Feature
-- This migration adds user profile and tracking functionality:
-- 1. Creates user_profiles table for basic profile information
-- 2. Creates profile_tracking table for historical tracking data
-- 3. Adds necessary indexes for performance

-- Enable foreign key support
PRAGMA foreign_keys = ON;

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id TEXT PRIMARY KEY,
  height_cm REAL NOT NULL,
  age INTEGER NOT NULL,
  gender TEXT CHECK(gender IN ('male', 'female')) NOT NULL,
  activity_level TEXT CHECK(activity_level IN ('sedentary', 'light', 'moderate', 'active', 'very_active')) DEFAULT 'sedentary',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create profile_tracking table
CREATE TABLE IF NOT EXISTS profile_tracking (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  weight_kg REAL,
  muscle_mass_kg REAL,
  body_fat_percentage REAL,
  bmr_calories INTEGER,
  tdee_calories INTEGER,
  recorded_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profile_tracking_user_id ON profile_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_tracking_recorded_date ON profile_tracking(recorded_date);
CREATE INDEX IF NOT EXISTS idx_profile_tracking_user_date ON profile_tracking(user_id, recorded_date);
