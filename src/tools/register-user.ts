import { ToolHandler, RegisterUserParams } from '../types/index.js';
import { createAuthError, createSuccessResponse, createErrorResponse } from '../utils/responses.js';
import { hashApiKey } from '../auth/middleware.js';
import { UserRepository } from '../repositories/index.js';

export const registerUserHandler: ToolHandler<RegisterUserParams> = async (
  userData,
  userId,
  env,
  isAdmin = false
) => {
  if (!userId) {
    return createAuthError();
  }

  if (!isAdmin) {
    return createErrorResponse('Admin access required to register new users.');
  }

  if (!env?.DB) {
    return createErrorResponse('Database not available. Please check your configuration.');
  }

  try {
    const repository = new UserRepository(env.DB);
    const apiKey = userData.api_key || `api-${crypto.randomUUID()}`;

    // Check if email already exists
    const existingUser = await repository.findByEmail(userData.email);
    if (existingUser) {
      return createErrorResponse(
        `User with email ${userData.email} already exists.`
      );
    }

    // Hash the API key for secure storage
    const apiKeyHash = await hashApiKey(apiKey);

    // Check if API key hash already exists
    const existingApiKey = await repository.findByApiKeyHash(apiKeyHash);
    if (existingApiKey) {
      return createErrorResponse(
        `API key already exists. Please provide a different one.`
      );
    }

    const newUserId = await repository.create(userData, apiKeyHash);

    return createSuccessResponse(
      `Successfully registered user "${userData.name}" with ID ${newUserId}.\nAPI Key: ${apiKey}\nEmail: ${userData.email}`
    );
  } catch (error) {
    console.error('Error registering user:', error);
    return createErrorResponse('Failed to register user. Please try again.');
  }
};
