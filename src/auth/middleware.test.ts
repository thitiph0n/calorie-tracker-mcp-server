import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hashApiKey, authenticateRequest, withAuth } from './middleware';

// Mock types for testing
interface MockEnv {
  DB?: {
    prepare: (query: string) => {
      bind: (value: any) => {
        first: () => Promise<any>;
      };
    };
  };
  MCP_OBJECT?: any;
}

describe('Authentication Middleware', () => {
  describe('hashApiKey', () => {
    it('should hash an API key consistently', async () => {
      const apiKey = 'test-api-key-123';
      const hash1 = await hashApiKey(apiKey);
      const hash2 = await hashApiKey(apiKey);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 produces 64 character hex string
      expect(hash1).toMatch(/^[a-f0-9]{64}$/); // Only lowercase hex characters
    });

    it('should produce different hashes for different API keys', async () => {
      const key1 = 'api-key-1';
      const key2 = 'api-key-2';

      const hash1 = await hashApiKey(key1);
      const hash2 = await hashApiKey(key2);

      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty string', async () => {
      const hash = await hashApiKey('');
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should handle special characters', async () => {
      const apiKey = 'test-key-!@#$%^&*()_+{}|:"<>?[]\\;\',./ ';
      const hash = await hashApiKey(apiKey);

      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('authenticateRequest', () => {
    let mockRequest: Request;
    let mockEnv: MockEnv;

    beforeEach(() => {
      mockEnv = {
        DB: {
          prepare: vi.fn().mockReturnValue({
            bind: vi.fn().mockReturnValue({
              first: vi.fn().mockResolvedValue(null),
            }),
          }),
        },
      };
    });

    it('should return null when no Authorization header is present', async () => {
      mockRequest = new Request('http://localhost', {
        headers: {},
      });

      const result = await authenticateRequest(mockRequest, { ...mockEnv, MCP_OBJECT: {} } as any);
      expect(result).toBeNull();
    });

    it('should return null when Authorization header does not start with Bearer', async () => {
      mockRequest = new Request('http://localhost', {
        headers: {
          Authorization: 'Basic dGVzdDp0ZXN0',
        },
      });

      const result = await authenticateRequest(mockRequest, { ...mockEnv, MCP_OBJECT: {} } as any);
      expect(result).toBeNull();
    });

    it('should return null when no DB is available', async () => {
      mockRequest = new Request('http://localhost', {
        headers: {
          Authorization: 'Bearer test-api-key',
        },
      });

      const result = await authenticateRequest(mockRequest, undefined);
      expect(result).toBeNull();
    });

    it('should return null when DB is not defined in env', async () => {
      mockRequest = new Request('http://localhost', {
        headers: {
          Authorization: 'Bearer test-api-key',
        },
      });

      const result = await authenticateRequest(mockRequest, { MCP_OBJECT: {} } as any);
      expect(result).toBeNull();
    });

    it('should return user data when valid API key is found', async () => {
      const mockUser = { id: 'user-123', role: 'user' };
      mockEnv.DB!.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(mockUser),
        }),
      });

      mockRequest = new Request('http://localhost', {
        headers: {
          Authorization: 'Bearer test-api-key',
        },
      });

      const result = await authenticateRequest(mockRequest, { ...mockEnv, MCP_OBJECT: {} } as any);

      expect(result).toEqual({
        userId: 'user-123',
        isAdmin: false,
      });
    });

    it('should identify admin users correctly', async () => {
      const mockAdmin = { id: 'admin-123', role: 'admin' };
      mockEnv.DB!.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(mockAdmin),
        }),
      });

      mockRequest = new Request('http://localhost', {
        headers: {
          Authorization: 'Bearer admin-api-key',
        },
      });

      const result = await authenticateRequest(mockRequest, { ...mockEnv, MCP_OBJECT: {} } as any);

      expect(result).toEqual({
        userId: 'admin-123',
        isAdmin: true,
      });
    });

    it('should handle database query with hashed API key', async () => {
      const apiKey = 'test-api-key';
      const expectedHash = await hashApiKey(apiKey);

      const prepareMock = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ id: 'user-123', role: 'user' }),
        }),
      });

      mockEnv.DB!.prepare = prepareMock;

      mockRequest = new Request('http://localhost', {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      await authenticateRequest(mockRequest, { ...mockEnv, MCP_OBJECT: {} } as any);

      expect(prepareMock).toHaveBeenCalledWith(
        'SELECT id, role FROM users WHERE api_key_hash = ?'
      );
      expect(prepareMock().bind).toHaveBeenCalledWith(expectedHash);
    });

    it('should return null when database query throws error', async () => {
      mockEnv.DB!.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockRejectedValue(new Error('Database error')),
        }),
      });

      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      mockRequest = new Request('http://localhost', {
        headers: {
          Authorization: 'Bearer test-api-key',
        },
      });

      const result = await authenticateRequest(mockRequest, { ...mockEnv, MCP_OBJECT: {} } as any);

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Database authentication error:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should return null when user is not found in database', async () => {
      mockEnv.DB!.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null),
        }),
      });

      mockRequest = new Request('http://localhost', {
        headers: {
          Authorization: 'Bearer invalid-api-key',
        },
      });

      const result = await authenticateRequest(mockRequest, { ...mockEnv, MCP_OBJECT: {} } as any);
      expect(result).toBeNull();
    });
  });

  describe('withAuth', () => {
    let mockRequest: Request;
    let mockEnv: MockEnv;
    let mockCtx: ExecutionContext;
    let mockHandler: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockRequest = new Request('http://localhost');
      mockEnv = {
        DB: {
          prepare: vi.fn().mockReturnValue({
            bind: vi.fn().mockReturnValue({
              first: vi.fn().mockResolvedValue(null),
            }),
          }),
        },
      };
      mockCtx = {} as ExecutionContext;
      mockHandler = vi.fn().mockResolvedValue(new Response('Success'));
    });

    it('should return 401 when authentication fails', async () => {
      const wrappedHandler = withAuth(mockHandler);

      const response = await wrappedHandler(
        mockRequest,
        { ...mockEnv, MCP_OBJECT: {} } as any,
        mockCtx
      );

      expect(response.status).toBe(401);
      expect(response.headers.get('Content-Type')).toBe('application/json');

      const body = await response.json();
      expect(body).toEqual({
        error:
          'Unauthorized. Please provide a valid API key in the Authorization header.',
      });

      expect(mockHandler).not.toHaveBeenCalled();
    });

    it('should call handler when authentication succeeds for regular user', async () => {
      const mockUser = { id: 'user-123', role: 'user' };
      mockEnv.DB!.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(mockUser),
        }),
      });

      mockRequest = new Request('http://localhost', {
        headers: {
          Authorization: 'Bearer valid-api-key',
        },
      });

      const wrappedHandler = withAuth(mockHandler);
      const response = await wrappedHandler(
        mockRequest,
        { ...mockEnv, MCP_OBJECT: {} } as any,
        mockCtx
      );

      expect(mockHandler).toHaveBeenCalledWith(
        mockRequest,
        { ...mockEnv, MCP_OBJECT: {} },
        mockCtx,
        'user-123',
        false
      );

      expect(response).toBeInstanceOf(Response);
      const responseText = await response.text();
      expect(responseText).toBe('Success');
    });

    it('should call handler when authentication succeeds for admin user', async () => {
      const mockAdmin = { id: 'admin-123', role: 'admin' };
      mockEnv.DB!.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(mockAdmin),
        }),
      });

      mockRequest = new Request('http://localhost', {
        headers: {
          Authorization: 'Bearer admin-api-key',
        },
      });

      const wrappedHandler = withAuth(mockHandler);
      const response = await wrappedHandler(
        mockRequest,
        { ...mockEnv, MCP_OBJECT: {} } as any,
        mockCtx
      );

      expect(mockHandler).toHaveBeenCalledWith(
        mockRequest,
        { ...mockEnv, MCP_OBJECT: {} },
        mockCtx,
        'admin-123',
        true
      );
    });

    it('should pass through handler response', async () => {
      const customResponse = new Response('Custom response', {
        status: 200,
        headers: { 'Custom-Header': 'value' },
      });

      mockHandler.mockResolvedValue(customResponse);

      const mockUser = { id: 'user-123', role: 'user' };
      mockEnv.DB!.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(mockUser),
        }),
      });

      mockRequest = new Request('http://localhost', {
        headers: {
          Authorization: 'Bearer valid-api-key',
        },
      });

      const wrappedHandler = withAuth(mockHandler);
      const response = await wrappedHandler(
        mockRequest,
        { ...mockEnv, MCP_OBJECT: {} } as any,
        mockCtx
      );

      expect(response.status).toBe(200);
      expect(response.headers.get('Custom-Header')).toBe('value');

      const responseText = await response.text();
      expect(responseText).toBe('Custom response');
    });

    it('should handle handler throwing error', async () => {
      const handlerError = new Error('Handler error');
      mockHandler.mockRejectedValue(handlerError);

      const mockUser = { id: 'user-123', role: 'user' };
      mockEnv.DB!.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(mockUser),
        }),
      });

      mockRequest = new Request('http://localhost', {
        headers: {
          Authorization: 'Bearer valid-api-key',
        },
      });

      const wrappedHandler = withAuth(mockHandler);

      await expect(
        wrappedHandler(mockRequest, mockEnv as any, mockCtx)
      ).rejects.toThrow('Handler error');
    });
  });
});
