import { ToolHandler, DeleteEntryParams } from '../types/index.js';
import { createAuthError, createSuccessResponse, createErrorResponse } from '../utils/responses.js';
import { FoodEntryRepository } from '../repositories/index.js';

export const deleteEntryHandler: ToolHandler<DeleteEntryParams> = async (
  { entry_id },
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
    const deleted = await repository.delete(entry_id, userId);

    if (!deleted) {
      return createErrorResponse(
        `Entry ${entry_id} not found or you don't have permission to delete it.`
      );
    }

    return createSuccessResponse(
      `Successfully deleted entry ${entry_id} for user ${userId}`
    );
  } catch (error) {
    console.error('Error deleting entry:', error);
    return createErrorResponse(
      'Failed to delete food entry. Please try again.'
    );
  }
};
