import { ToolHandler, UpdateEntryParams } from '../types/index.js';
import { createAuthError, createSuccessResponse, createErrorResponse } from '../utils/responses.js';
import { FoodEntryRepository } from '../repositories/index.js';

export const updateEntryHandler: ToolHandler<UpdateEntryParams> = async (
  updateData,
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
    const { entry_id, ...fieldsToUpdate } = updateData;
    
    const updated = await repository.update(entry_id, userId, fieldsToUpdate);

    if (!updated) {
      return createErrorResponse(
        `Entry ${entry_id} not found or you don't have permission to update it.`
      );
    }

    return createSuccessResponse(
      `Successfully updated entry ${entry_id} for user ${userId}`
    );
  } catch (error) {
    console.error('Error updating entry:', error);
    return createErrorResponse(
      'Failed to update food entry. Please try again.'
    );
  }
};
