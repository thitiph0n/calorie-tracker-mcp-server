import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

// Tool handler type
export interface ToolHandler<T = Record<string, unknown>> {
  (
    params: T,
    userId?: string,
    env?: any,
    isAdmin?: boolean
  ): Promise<CallToolResult>;
}

// Food entry types
export interface FoodEntry {
  id: string;
  user_id: string;
  food_name: string;
  calories: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  entry_date: string;
  created_at: string;
  updated_at?: string;
}

// User types
export interface User {
  id: string;
  name: string;
  email: string;
  api_key_hash?: string;
  role: 'user' | 'admin';
  created_at: string;
  updated_at?: string;
}

// User profile types
export interface UserProfile {
  user_id: string;
  height_cm: number;
  age: number;
  gender: 'male' | 'female';
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  created_at: string;
  updated_at: string;
}

export interface ProfileTracking {
  id: string;
  user_id: string;
  weight_kg?: number;
  muscle_mass_kg?: number;
  body_fat_percentage?: number;
  bmr_calories?: number;
  tdee_calories?: number;
  recorded_date: string;
  created_at: string;
}

export interface ProfileWithCalculations extends UserProfile {
  latest_tracking?: ProfileTracking;
  bmr_calories?: number;
  tdee_calories?: number;
}

// Tool parameter types
export interface AddEntryParams {
  food_name: string;
  calories: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  entry_date?: string;
}

export interface UpdateEntryParams {
  entry_id: string;
  food_name?: string;
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

export interface DeleteEntryParams {
  entry_id: string;
}

export interface ListEntriesParams {
  date?: string;
  limit?: number;
  offset?: number;
}

export interface RegisterUserParams {
  name: string;
  email: string;
  api_key?: string;
}

export interface RevokeUserParams {
  user_id?: string;
  email?: string;
}

// Profile tool parameter types
export interface UpdateProfileParams {
  height_cm?: number;
  age?: number;
  gender?: 'male' | 'female';
  activity_level?:
    | 'sedentary'
    | 'light'
    | 'moderate'
    | 'active'
    | 'very_active';
  weight_kg?: number;
  muscle_mass_kg?: number;
  body_fat_percentage?: number;
}

export interface GetProfileHistoryParams {
  date?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}
