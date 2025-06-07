import {
  ToolHandler,
  createAuthError,
  createSuccessResponse,
  createErrorResponse,
} from './base.js';
import { hashApiKey } from '../auth/middleware.js';

export interface RegisterUserParams {
  name: string;
  email: string;
  api_key?: string;
}

export interface RegisterUserResponse {
  success: boolean;
  message: string;
  userId?: string;
  apiKey?: string;
  warning?: string;
}

export const registerUserHandler: ToolHandler<RegisterUserParams> = async (
  userData,
  userId,
  env,
  isAdmin = false
) => {
  if (!userId) {
    return createAuthError();
  }

  // Check if user has admin role
  if (!isAdmin) {
    return createErrorResponse('Admin access required to register new users.');
  }

  try {
    // Insert into D1 database
    if (env?.DB) {
      const newUserId = crypto.randomUUID();
      const apiKey = userData.api_key || `api-${crypto.randomUUID()}`;

      // Check if email already exists
      const existingUser = await env.DB.prepare(
        'SELECT id FROM users WHERE email = ?'
      )
        .bind(userData.email)
        .first();

      if (existingUser) {
        return createErrorResponse(
          `User with email ${userData.email} already exists.`
        );
      }

      // Hash the API key for secure storage
      const apiKeyHash = await hashApiKey(apiKey);

      // Check if API key hash already exists
      const existingApiKey = await env.DB.prepare(
        'SELECT id FROM users WHERE api_key_hash = ?'
      )
        .bind(apiKeyHash)
        .first();

      if (existingApiKey) {
        return createErrorResponse(
          `API key already exists. Please provide a different one.`
        );
      }

      await env.DB.prepare(
        `
        INSERT INTO users (id, name, email, api_key_hash, role)
        VALUES (?, ?, ?, ?, 'user')
      `
      )
        .bind(newUserId, userData.name, userData.email, apiKeyHash)
        .run();

      return createSuccessResponse(
        `Successfully registered user "${userData.name}" with ID ${newUserId}.\nAPI Key: ${apiKey}\nEmail: ${userData.email}`
      );
    }

    // Mock response for development
    const mockApiKey = userData.api_key || `api-${Date.now()}`;
    return createSuccessResponse(
      `Successfully registered user "${userData.name}".\nAPI Key: ${mockApiKey}\nEmail: ${userData.email}`
    );
  } catch (error) {
    console.error('Error registering user:', error);
    return createErrorResponse('Failed to register user. Please try again.');
  }
};
