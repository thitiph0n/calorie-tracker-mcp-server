# User Profile Feature Implementation Plan

## Overview

Add user profile functionality to track personal health metrics and calculate BMR/TDEE automatically. This feature will enable users to monitor their physical progress over time.

## New Tools

### Core Profile Tools

- `get_profile` - Retrieve current user profile with auto-calculated BMR/TDEE
- `update_profile` - Update basic profile info (height, current weight, muscle mass, body fat)
- `get_profile_history` - View historical tracking data with date filtering

## Database Changes

### New Tables

#### `user_profiles` Table

```sql
CREATE TABLE user_profiles (
  user_id TEXT PRIMARY KEY,
  height_cm REAL NOT NULL,
  age INTEGER NOT NULL,
  gender TEXT CHECK(gender IN ('male', 'female')) NOT NULL,
  activity_level TEXT CHECK(activity_level IN ('sedentary', 'light', 'moderate', 'active', 'very_active')) DEFAULT 'sedentary',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### `profile_tracking` Table

```sql
CREATE TABLE profile_tracking (
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
```

### Migration File

- Create `migrations/0003_user_profile.sql`
- Add indexes for performance: `user_id`, `recorded_date`

## Code Changes

### New Repositories

- `src/repositories/user-profile.repository.ts`
  - Profile CRUD operations
  - Historical data retrieval with pagination
- `src/repositories/profile-tracking.repository.ts`
  - Tracking data management
  - Date-based queries

### New Tools Implementation

- `src/tools/get-profile.ts` - Fetch current profile with BMR/TDEE calculations
- `src/tools/update-profile.ts` - Update profile + auto-calculate BMR/TDEE
- `src/tools/get-profile-history.ts` - Historical tracking data

### Type Definitions

Add to `src/types/index.ts`:

```typescript
interface UserProfile {
  user_id: string;
  height_cm: number;
  age: number;
  gender: 'male' | 'female';
  activity_level: string;
}

interface ProfileTracking {
  id: string;
  user_id: string;
  weight_kg?: number;
  muscle_mass_kg?: number;
  body_fat_percentage?: number;
  bmr_calories?: number;
  tdee_calories?: number;
  recorded_date: string;
}
```

### MCP Server Updates

- Register new tools in `src/index.ts`
- Add validation schemas using Zod
- Implement tool handlers with proper authentication

## Implementation Notes

- All profile tools require user authentication
- BMR/TDEE automatically calculated and returned with profile data
- Historical data limited to 100 entries per query for performance
- Date filtering supports YYYY-MM-DD format
- Gender and activity level use enum constraints for data integrity
- Calculations use Harris-Benedict equation (BMR) and activity multipliers (TDEE)
