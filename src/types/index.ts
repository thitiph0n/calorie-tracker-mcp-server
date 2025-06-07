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

