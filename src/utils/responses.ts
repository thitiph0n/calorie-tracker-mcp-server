import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

// Helper to create an auth error response
export const createAuthError = (): CallToolResult => ({
  isError: true,
  content: [
    {
      type: 'text',
      text: 'Authentication required. Please provide a valid API key in the Authorization header.',
    },
  ],
});

// Helper to create a success response with a text message
export const createSuccessResponse = (message: string): CallToolResult => ({
  content: [{
    type: 'text',
    text: message
  }]
});

// Helper to create an error response with a text message
export const createErrorResponse = (message: string): CallToolResult => ({
  isError: true,
  content: [{
    type: 'text',
    text: message
  }]
});

