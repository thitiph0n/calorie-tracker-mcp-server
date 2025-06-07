import { ToolHandler, RevokeUserParams } from '../types/index.js';
import { createAuthError, createSuccessResponse, createErrorResponse } from '../utils/responses.js';
import { UserRepository } from '../repositories/index.js';

export const revokeUserHandler: ToolHandler<RevokeUserParams> = async (
  revokeData,
  userId,
  env,
  isAdmin = false
) => {
  if (!userId) {
    return createAuthError();
  }

  if (!isAdmin) {
    return createErrorResponse(
      'Admin access required to revoke user API keys.'
    );
  }

  if (!revokeData.user_id && !revokeData.email) {
    return createErrorResponse('Either user_id or email must be provided.');
  }

  if (!env?.DB) {
    return createErrorResponse('Database not available. Please check your configuration.');
  }

  try {
    const repository = new UserRepository(env.DB);
    let targetUser;

    // Find user by ID or email
    if (revokeData.user_id) {
      targetUser = await repository.findById(revokeData.user_id);
    } else if (revokeData.email) {
      targetUser = await repository.findByEmail(revokeData.email);
    }

    if (!targetUser) {
      return createErrorResponse('User not found.');
    }

    // Prevent revoking admin user's own key (safety check)
    if (targetUser.id === userId) {
      return createErrorResponse('Cannot revoke your own API key.');
    }

    // Remove the API key hash (effectively revoking access)
    const revoked = await repository.revokeApiKey(targetUser.id);
    
    if (!revoked) {
      return createErrorResponse('Failed to revoke API key. No changes were made.');
    }

    return createSuccessResponse(
      `Successfully revoked API key for user "${targetUser.name}" (${targetUser.email}). User ID: ${targetUser.id}`
    );
  } catch (error) {
    console.error('Error revoking user API key:', error);
    return createErrorResponse(
      'Failed to revoke user API key. Please try again.'
    );
  }
};
