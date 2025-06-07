import {
  ToolHandler,
  createAuthError,
  createSuccessResponse,
  createErrorResponse,
} from './base.js';

export interface AddEntryParams {
  food_name: string;
  calories: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  entry_date?: string;
}

export const addEntryHandler: ToolHandler<AddEntryParams> = async (
  entryData,
  userId,
  env,
  isAdmin = false
) => {
  if (!userId) {
    return createAuthError();
  }

  try {
    // Insert into D1 database
    if (env?.DB) {
      const entryId = crypto.randomUUID();
      const entryDate =
        entryData.entry_date || new Date().toISOString().split('T')[0];

      await env.DB.prepare(
        `
        INSERT INTO food_entries (id, user_id, food_name, calories, protein_g, carbs_g, fat_g, meal_type, entry_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
        .bind(
          entryId,
          userId,
          entryData.food_name,
          entryData.calories,
          entryData.protein_g || null,
          entryData.carbs_g || null,
          entryData.fat_g || null,
          entryData.meal_type || null,
          entryDate
        )
        .run();

      return createSuccessResponse(
        `Successfully added "${entryData.food_name}" (${entryData.calories} calories) with ID ${entryId} for user ${userId}`
      );
    }

    // Mock response for development
    return createSuccessResponse(
      `Successfully added "${entryData.food_name}" (${entryData.calories} calories) for user ${userId}`
    );
  } catch (error) {
    console.error('Error adding entry:', error);
    return createErrorResponse('Failed to add food entry. Please try again.');
  }
};
