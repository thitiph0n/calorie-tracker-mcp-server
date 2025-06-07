import { describe, it, expect, vi, beforeEach } from 'vitest';
import { revokeUserHandler } from '../tools/revoke-user.js';
import type { RevokeUserParams } from '../types/index.js';

// Mock the repository
vi.mock('../repositories/index.js', () => ({
  UserRepository: vi.fn().mockImplementation(() => ({
    findByEmail: vi
      .fn()
      .mockResolvedValue({ id: 'user-123', name: 'John Doe', email: 'john@example.com' }),
    findById: vi
      .fn()
      .mockResolvedValue({ id: 'user-123', name: 'John Doe', email: 'john@example.com' }),
    revokeApiKey: vi.fn().mockResolvedValue(true),
  })),
}));

describe('revokeUserHandler', () => {
  const mockEnv = {
    DB: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return auth error when userId is not provided', async () => {
    const params: RevokeUserParams = {
      user_id: 'user-123',
    };

    const result = await revokeUserHandler(params, undefined, mockEnv, true);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Authentication required');
  });

  it('should return error when user is not admin', async () => {
    const params: RevokeUserParams = {
      user_id: 'user-123',
    };

    const result = await revokeUserHandler(params, 'user-456', mockEnv, false);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Admin access required');
  });

  it('should return error when neither user_id nor email is provided', async () => {
    const params: RevokeUserParams = {};

    const result = await revokeUserHandler(params, 'admin-123', mockEnv, true);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain(
      'Either user_id or email must be provided'
    );
  });

  it('should return error when database is not available', async () => {
    const params: RevokeUserParams = {
      user_id: 'user-123',
    };

    const result = await revokeUserHandler(params, 'admin-123', {}, true);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Database not available');
  });

  it('should successfully revoke user by user_id', async () => {
    const params: RevokeUserParams = {
      user_id: 'user-123',
    };

    const result = await revokeUserHandler(params, 'admin-123', mockEnv, true);

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain(
      'Successfully revoked API key for user "John Doe"'
    );
  });

  it('should successfully revoke user by email', async () => {
    const params: RevokeUserParams = {
      email: 'john@example.com',
    };

    const result = await revokeUserHandler(params, 'admin-123', mockEnv, true);

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain(
      'Successfully revoked API key for user "John Doe"'
    );
  });

  it('should return error when user is not found by user_id', async () => {
    // Mock repository to return null for user lookup
    const { UserRepository } = await import('../repositories/index.js');
    vi.mocked(UserRepository).mockImplementation(
      () =>
        ({
          findByEmail: vi.fn().mockResolvedValue(null),
          findById: vi.fn().mockResolvedValue(null),
          revokeApiKey: vi.fn().mockResolvedValue(true),
        } as any)
    );

    const params: RevokeUserParams = {
      user_id: 'user-123',
    };

    const result = await revokeUserHandler(params, 'admin-123', mockEnv, true);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('User not found');
  });

  it('should return error when user is not found by email', async () => {
    // Mock repository to return null for user lookup
    const { UserRepository } = await import('../repositories/index.js');
    vi.mocked(UserRepository).mockImplementation(
      () =>
        ({
          findByEmail: vi.fn().mockResolvedValue(null),
          findById: vi.fn().mockResolvedValue(null),
          revokeApiKey: vi.fn().mockResolvedValue(true),
        } as any)
    );

    const params: RevokeUserParams = {
      email: 'notfound@example.com',
    };

    const result = await revokeUserHandler(params, 'admin-123', mockEnv, true);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('User not found');
  });

  it('should return error when revoke operation fails', async () => {
    // Mock repository to return false for revoke operation
    const { UserRepository } = await import('../repositories/index.js');
    vi.mocked(UserRepository).mockImplementation(
      () =>
        ({
          findByEmail: vi
            .fn()
            .mockResolvedValue({ id: 'user-123', email: 'john@example.com' }),
          findById: vi
            .fn()
            .mockResolvedValue({ id: 'user-123', email: 'john@example.com' }),
          revokeApiKey: vi.fn().mockResolvedValue(false),
        } as any)
    );

    const params: RevokeUserParams = {
      user_id: 'user-123',
    };

    const result = await revokeUserHandler(params, 'admin-123', mockEnv, true);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Failed to revoke API key. No changes were made.');
  });

  it('should handle repository errors gracefully', async () => {
    // Mock repository to throw error
    const { UserRepository } = await import('../repositories/index.js');
    vi.mocked(UserRepository).mockImplementation(
      () =>
        ({
          findByEmail: vi.fn().mockRejectedValue(new Error('Database error')),
          findById: vi.fn().mockRejectedValue(new Error('Database error')),
          revokeApiKey: vi.fn().mockResolvedValue(true),
        } as any)
    );

    const params: RevokeUserParams = {
      user_id: 'user-123',
    };

    const result = await revokeUserHandler(params, 'admin-123', mockEnv, true);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Failed to revoke user API key');
  });
});
