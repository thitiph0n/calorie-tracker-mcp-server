import {
  ToolHandler,
  createAuthError,
  createSuccessResponse,
  createErrorResponse,
} from './base.js';

export interface DeleteEntryParams {
  entry_id: string;
}

export const deleteEntryHandler: ToolHandler<DeleteEntryParams> = async (
  { entry_id },
  userId,
  env,
  isAdmin = false
) => {
  if (!userId) {
    return createAuthError();
  }

  try {
    // Delete from D1 database with ownership check
    if (env?.DB) {
      const result = await env.DB.prepare(
        `
        DELETE FROM food_entries WHERE id = ? AND user_id = ?
      `
      )
        .bind(entry_id, userId)
        .run();

      if (result.meta.changes === 0) {
        return createErrorResponse(
          `Entry ${entry_id} not found or you don't have permission to delete it.`
        );
      }

      return createSuccessResponse(
        `Successfully deleted entry ${entry_id} for user ${userId}`
      );
    }

    // Mock response for development
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
