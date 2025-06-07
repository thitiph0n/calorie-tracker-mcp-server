import {
  ToolHandler,
  createAuthError,
  createSuccessResponse,
  createErrorResponse,
} from './base.js';

export interface UpdateEntryParams {
  entry_id: string;
  food_name?: string;
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

export interface UpdateEntryResponse {
  success: boolean;
  message: string;
  updatedFields?: Record<string, unknown>;
}

// Helper function to validate update params
function validateUpdateParams(params: UpdateEntryParams): { isValid: boolean; error?: string } {
  const { entry_id, ...rest } = params;
  const hasUpdates = Object.values(rest).some(value => value !== undefined);
  
  if (!hasUpdates) {
    return {
      isValid: false,
      error: 'At least one field to update must be provided (food_name, calories, protein_g, carbs_g, fat_g, or meal_type)'
    };
  }
  
  return { isValid: true };
}

export const updateEntryHandler: ToolHandler<UpdateEntryParams> = async (
  updateData,
  userId,
  env,
  isAdmin = false
) => {
  if (!userId) {
    return createAuthError();
  }

  try {
    // Update in D1 database with ownership check
    if (env?.DB) {
      // Build dynamic update query based on provided fields
      const updates: string[] = [];
      const values: any[] = [];

      if (updateData.food_name !== undefined) {
        updates.push('food_name = ?');
        values.push(updateData.food_name);
      }
      if (updateData.calories !== undefined) {
        updates.push('calories = ?');
        values.push(updateData.calories);
      }
      if (updateData.protein_g !== undefined) {
        updates.push('protein_g = ?');
        values.push(updateData.protein_g);
      }
      if (updateData.carbs_g !== undefined) {
        updates.push('carbs_g = ?');
        values.push(updateData.carbs_g);
      }
      if (updateData.fat_g !== undefined) {
        updates.push('fat_g = ?');
        values.push(updateData.fat_g);
      }
      if (updateData.meal_type !== undefined) {
        updates.push('meal_type = ?');
        values.push(updateData.meal_type);
      }

      if (updates.length === 0) {
        return createErrorResponse('No fields provided to update.');
      }

      // Add updated_at timestamp
      updates.push('updated_at = CURRENT_TIMESTAMP');

      // Add WHERE conditions
      values.push(updateData.entry_id, userId);

      const result = await env.DB.prepare(
        `
        UPDATE food_entries 
        SET ${updates.join(', ')}
        WHERE id = ? AND user_id = ?
      `
      )
        .bind(...values)
        .run();

      if (result.meta.changes === 0) {
        return createErrorResponse(
          `Entry ${updateData.entry_id} not found or you don't have permission to update it.`
        );
      }

      return createSuccessResponse(
        `Successfully updated entry ${updateData.entry_id} for user ${userId}`
      );
    }

    // Mock response for development
    return createSuccessResponse(
      `Successfully updated entry ${updateData.entry_id} for user ${userId}`
    );
  } catch (error) {
    console.error('Error updating entry:', error);
    return createErrorResponse(
      'Failed to update food entry. Please try again.'
    );
  }
};
