import { ToolHandler, AddEntryParams } from '../types/index.js';
import { createAuthError, createSuccessResponse, createErrorResponse } from '../utils/responses.js';
import { FoodEntryRepository } from '../repositories/index.js';

export const addEntryHandler: ToolHandler<AddEntryParams> = async (
  entryData,
  userId,
  env
) => {
  if (!userId) {
    return createAuthError();
  }

  if (!env?.DB) {
    return createErrorResponse('Database not available. Please check your configuration.');
  }

  try {
    const repository = new FoodEntryRepository(env.DB);
    const entryId = await repository.create(entryData, userId);

    return createSuccessResponse(
      `Successfully added "${entryData.food_name}" (${entryData.calories} calories) with ID ${entryId} for user ${userId}`
    );
  } catch (error) {
    console.error('Error adding entry:', error);
    return createErrorResponse('Failed to add food entry. Please try again.');
  }
};
