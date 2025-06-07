import {
  ToolHandler,
  createAuthError,
  createSuccessResponse,
  createErrorResponse,
} from './base.js';

export interface RevokeUserParams {
  user_id?: string;
  email?: string;
}

export interface RevokeUserResponse {
  success: boolean;
  message: string;
  revoked: boolean;
  userId?: string;
  email?: string;
}

// Helper function to validate revoke params
function validateRevokeParams(params: RevokeUserParams): { isValid: boolean; error?: string } {
  if (!params.user_id && !params.email) {
    return { 
      isValid: false, 
      error: 'Either user_id or email must be provided' 
    };
  }
  return { isValid: true };
}

export const revokeUserHandler: ToolHandler<RevokeUserParams> = async (
  revokeData,
  userId,
  env,
  isAdmin = false
) => {
  if (!userId) {
    return createAuthError();
  }

  // Check if user has admin role
  if (!isAdmin) {
    return createErrorResponse(
      'Admin access required to revoke user API keys.'
    );
  }

  // Must provide either user_id or email
  if (!revokeData.user_id && !revokeData.email) {
    return createErrorResponse('Either user_id or email must be provided.');
  }

  try {
    if (env?.DB) {
      let targetUser;

      // Find user by ID or email
      if (revokeData.user_id) {
        targetUser = await env.DB.prepare(
          'SELECT id, name, email FROM users WHERE id = ?'
        )
          .bind(revokeData.user_id)
          .first();
      } else if (revokeData.email) {
        targetUser = await env.DB.prepare(
          'SELECT id, name, email FROM users WHERE email = ?'
        )
          .bind(revokeData.email)
          .first();
      }

      if (!targetUser) {
        return createErrorResponse('User not found.');
      }

      // Prevent revoking admin user's own key (safety check)
      if (targetUser.id === userId) {
        return createErrorResponse('Cannot revoke your own API key.');
      }

      // Remove the API key hash (effectively revoking access)
      await env.DB.prepare('UPDATE users SET api_key_hash = NULL WHERE id = ?')
        .bind(targetUser.id)
        .run();

      return createSuccessResponse(
        `Successfully revoked API key for user "${targetUser.name}" (${targetUser.email}). User ID: ${targetUser.id}`
      );
    }

    // Mock response for development
    return createSuccessResponse(
      `Mock: Successfully revoked API key for user ${
        revokeData.user_id || revokeData.email
      }`
    );
  } catch (error) {
    console.error('Error revoking user API key:', error);
    return createErrorResponse(
      'Failed to revoke user API key. Please try again.'
    );
  }
};
