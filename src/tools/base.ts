// Base types and utilities for MCP tools
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export interface ToolHandler<T = Record<string, unknown>> {
  (
    params: T,
    userId?: string,
    env?: any,
    isAdmin?: boolean
  ): Promise<CallToolResult>;
}

// Helper function to extract auth context from MCP request context
// This is a workaround since MCP tools don't have direct access to the request
export function getAuthContext(): {
  userId: string;
  env: any;
  isAdmin: boolean;
} | null {
  // In a real implementation, this would need to access the current request context
  // For now, we'll return null and handle auth differently
  return null;
}

export const createAuthError = (): CallToolResult => ({
  isError: true,
  content: [
    {
      type: 'text',
      text: 'Authentication required. Please provide a valid API key in the Authorization header.',
    },
  ],
});

// Base interface for text content
export interface TextContent {
  type: 'text';
  text: string;
}

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

// Helper to create a success response with data
export const createDataResponse = <T extends Record<string, unknown>>(data: T): CallToolResult => ({
  content: [{
    type: 'text',
    text: 'Operation completed successfully',
    ...data
  }]
});

// Helper to create an error response with error details
export const createDetailedErrorResponse = (message: string, error: unknown): CallToolResult => ({
  isError: true,
  content: [{
    type: 'text',
    text: `${message}: ${error instanceof Error ? error.message : String(error)}`
  }]
});
