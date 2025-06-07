import { ToolHandler, ListEntriesParams, FoodEntry } from '../types/index.js';
import { createAuthError, createSuccessResponse, createErrorResponse } from '../utils/responses.js';
import { FoodEntryRepository } from '../repositories/index.js';

export const listEntriesHandler: ToolHandler<ListEntriesParams> = async (
  params,
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
    const entries = await repository.findByUserAndDate(userId, params);

    return createSuccessResponse(
      `Found ${entries.length} entries for user ${userId}:\n${JSON.stringify(
        entries,
        null,
        2
      )}`
    );
  } catch (error) {
    console.error('Error listing entries:', error);
    return createErrorResponse(
      'Failed to retrieve food entries. Please try again.'
    );
  }
};
