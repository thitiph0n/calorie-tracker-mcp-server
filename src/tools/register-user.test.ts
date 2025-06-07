import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerUserHandler } from '../tools/register-user.js';
import type { RegisterUserParams } from '../types/index.js';

// Mock dependencies
vi.mock('../repositories/index.js', () => ({
  UserRepository: vi.fn().mockImplementation(() => ({
    findByEmail: vi.fn().mockResolvedValue(null),
    findByApiKeyHash: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue('new-user-id'),
  })),
}));

vi.mock('../auth/middleware.js', () => ({
  hashApiKey: vi.fn().mockResolvedValue('hashed-api-key'),
}));

describe('registerUserHandler', () => {
  const mockEnv = {
    DB: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return auth error when userId is not provided', async () => {
    const params: RegisterUserParams = {
      name: 'John Doe',
      email: 'john@example.com',
    };

    const result = await registerUserHandler(params, undefined, mockEnv, true);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Authentication required');
  });

  it('should return error when user is not admin', async () => {
    const params: RegisterUserParams = {
      name: 'John Doe',
      email: 'john@example.com',
    };

    const result = await registerUserHandler(
      params,
      'user-123',
      mockEnv,
      false
    );

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Admin access required');
  });

  it('should return error when database is not available', async () => {
    const params: RegisterUserParams = {
      name: 'John Doe',
      email: 'john@example.com',
    };

    const result = await registerUserHandler(params, 'admin-123', {}, true);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Database not available');
  });

  it('should successfully register a new user', async () => {
    const params: RegisterUserParams = {
      name: 'John Doe',
      email: 'john@example.com',
    };

    const result = await registerUserHandler(
      params,
      'admin-123',
      mockEnv,
      true
    );

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain(
      'Successfully registered user "John Doe"'
    );
    expect(result.content[0].text).toContain('new-user-id');
    expect(result.content[0].text).toContain('API Key:');
    expect(result.content[0].text).toContain('john@example.com');
  });

  it('should use provided API key when given', async () => {
    const params: RegisterUserParams = {
      name: 'John Doe',
      email: 'john@example.com',
      api_key: 'custom-api-key',
    };

    const result = await registerUserHandler(
      params,
      'admin-123',
      mockEnv,
      true
    );

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain('API Key: custom-api-key');
  });

  it('should return error when email already exists', async () => {
    // Mock repository to return existing user
    const { UserRepository } = await import('../repositories/index.js');
    vi.mocked(UserRepository).mockImplementation(
      () =>
        ({
          findByEmail: vi.fn().mockResolvedValue({ id: 'existing-user' }),
          findByApiKeyHash: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue('new-user-id'),
        } as any)
    );

    const params: RegisterUserParams = {
      name: 'John Doe',
      email: 'john@example.com',
    };

    const result = await registerUserHandler(
      params,
      'admin-123',
      mockEnv,
      true
    );

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain(
      'User with email john@example.com already exists'
    );
  });

  it('should return error when API key already exists', async () => {
    // Mock repository to return existing API key
    const { UserRepository } = await import('../repositories/index.js');
    vi.mocked(UserRepository).mockImplementation(
      () =>
        ({
          findByEmail: vi.fn().mockResolvedValue(null),
          findByApiKeyHash: vi.fn().mockResolvedValue({ id: 'existing-user' }),
          create: vi.fn().mockResolvedValue('new-user-id'),
        } as any)
    );

    const params: RegisterUserParams = {
      name: 'John Doe',
      email: 'john@example.com',
      api_key: 'existing-key',
    };

    const result = await registerUserHandler(
      params,
      'admin-123',
      mockEnv,
      true
    );

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('API key already exists');
  });

  it('should handle repository errors gracefully', async () => {
    // Mock repository to throw error
    const { UserRepository } = await import('../repositories/index.js');
    vi.mocked(UserRepository).mockImplementation(
      () =>
        ({
          findByEmail: vi.fn().mockRejectedValue(new Error('Database error')),
          findByApiKeyHash: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue('new-user-id'),
        } as any)
    );

    const params: RegisterUserParams = {
      name: 'John Doe',
      email: 'john@example.com',
    };

    const result = await registerUserHandler(
      params,
      'admin-123',
      mockEnv,
      true
    );

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Failed to register user');
  });
});
