import { describe, it, expect } from 'vitest';
import {
  createAuthError,
  createSuccessResponse,
  createErrorResponse,
} from '../utils/responses.js';

describe('Response Utils', () => {
  describe('createAuthError', () => {
    it('should create an auth error response', () => {
      const result = createAuthError();

      expect(result.isError).toBe(true);
      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toEqual({
        type: 'text',
        text: 'Authentication required. Please provide a valid API key in the Authorization header.',
      });
    });
  });

  describe('createSuccessResponse', () => {
    it('should create a success response with message', () => {
      const message = 'Operation completed successfully';
      const result = createSuccessResponse(message);

      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toEqual({
        type: 'text',
        text: message,
      });
    });
  });

  describe('createErrorResponse', () => {
    it('should create an error response with message', () => {
      const message = 'Something went wrong';
      const result = createErrorResponse(message);

      expect(result.isError).toBe(true);
      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toEqual({
        type: 'text',
        text: message,
      });
    });
  });
});
