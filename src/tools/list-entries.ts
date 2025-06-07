import {
  ToolHandler,
  createAuthError,
  createSuccessResponse,
  createErrorResponse,
} from './base.js';

// Input schema for list entries
export interface ListEntriesParams {
  date?: string;
  limit?: number;
  offset?: number;
}

// Output schema for the response
export interface FoodEntry {
  id: string;
  food_name: string;
  calories: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  meal_type?: string;
  entry_date: string;
  created_at: string;
}

export interface ListEntriesResponse {
  success: boolean;
  entries: FoodEntry[];
  total: number;
  limit: number;
  offset: number;
}

export const listEntriesHandler: ToolHandler<ListEntriesParams> = async (
  params,
  userId,
  env,
  isAdmin = false
) => {
  if (!userId) {
    return createAuthError();
  }

  // Apply default values for undefined parameters
  const { date, limit = 10, offset = 0 } = params;

  try {
    // Query the D1 database for food entries
    if (env?.DB) {
      const entries = await env.DB.prepare(
        `
        SELECT * FROM food_entries
        WHERE user_id = ? AND entry_date = COALESCE(?, CURRENT_DATE)
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `
      )
        .bind(userId, date || null, limit, offset)
        .all();

      return createSuccessResponse(
        `Found ${
          entries.results.length
        } entries for user ${userId}:\n${JSON.stringify(
          entries.results,
          null,
          2
        )}`
      );
    }

    // Fallback to mock data for development
    const mockEntries = [
      {
        id: 'entry-1',
        food_name: 'Banana',
        calories: 105,
        protein_g: 1.3,
        carbs_g: 27,
        fat_g: 0.4,
        meal_type: 'breakfast',
        entry_date: date || new Date().toISOString().split('T')[0],
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    return createSuccessResponse(
      `Found ${
        mockEntries.length
      } entries for user ${userId}:\n${JSON.stringify(mockEntries, null, 2)}`
    );
  } catch (error) {
    console.error('Error listing entries:', error);
    return createErrorResponse(
      'Failed to retrieve food entries. Please try again.'
    );
  }
};
