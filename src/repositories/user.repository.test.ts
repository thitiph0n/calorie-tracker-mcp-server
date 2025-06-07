import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserRepository } from '../repositories/user.repository.js';
import type { RegisterUserParams } from '../types/index.js';

// Mock database interface
const createMockDB = () => {
  const mockResult = { success: true, meta: { rows_written: 1, changes: 1 } };
  const mockUser = {
    id: 'test-uuid-123',
    name: 'John Doe',
    email: 'john@example.com',
    api_key_hash: 'hashed-key',
    role: 'user',
    created_at: '2024-01-01T10:00:00Z',
  };

  const mockPrepare = vi.fn().mockReturnValue({
    bind: vi.fn().mockReturnValue({
      run: vi.fn().mockResolvedValue(mockResult),
      first: vi.fn().mockResolvedValue(mockUser),
    }),
  });

  return {
    prepare: mockPrepare,
    mockResult,
    mockUser,
  };
};

describe('UserRepository', () => {
  let repository: UserRepository;
  let mockDB: ReturnType<typeof createMockDB>;

  beforeEach(() => {
    mockDB = createMockDB();
    repository = new UserRepository(mockDB);
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const email = 'john@example.com';

      const user = await repository.findByEmail(email);

      expect(user).toEqual(mockDB.mockUser);
      expect(mockDB.prepare).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE email = ?'
      );
    });

    it('should return null when user not found', async () => {
      // Mock no user found
      mockDB.prepare.mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null),
        }),
      });

      const user = await repository.findByEmail('notfound@example.com');

      expect(user).toBeNull();
    });
  });

  describe('findById', () => {
    it('should find user by ID', async () => {
      const userId = 'test-uuid-123';

      const user = await repository.findById(userId);

      expect(user).toEqual(mockDB.mockUser);
      expect(mockDB.prepare).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE id = ?'
      );
    });

    it('should return null when user not found', async () => {
      // Mock no user found
      mockDB.prepare.mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null),
        }),
      });

      const user = await repository.findById('nonexistent-id');

      expect(user).toBeNull();
    });
  });

  describe('findByApiKeyHash', () => {
    it('should find user by API key hash', async () => {
      const apiKeyHash = 'hashed-key';

      const user = await repository.findByApiKeyHash(apiKeyHash);

      expect(user).toEqual(mockDB.mockUser);
      expect(mockDB.prepare).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE api_key_hash = ?'
      );
    });

    it('should return null when user not found', async () => {
      // Mock no user found
      mockDB.prepare.mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null),
        }),
      });

      const user = await repository.findByApiKeyHash('nonexistent-hash');

      expect(user).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a new user successfully', async () => {
      const userData: RegisterUserParams = {
        name: 'John Doe',
        email: 'john@example.com',
      };
      const apiKeyHash = 'hashed-key';

      const userId = await repository.create(userData, apiKeyHash);

      expect(userId).toBe('test-uuid-123');
      expect(mockDB.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users')
      );

      const bindCall = mockDB.prepare().bind;
      expect(bindCall).toHaveBeenCalledWith(
        'test-uuid-123',
        'John Doe',
        'john@example.com',
        'hashed-key'
      );
    });
  });

  describe('revokeApiKey', () => {
    it('should revoke API key successfully', async () => {
      const userId = 'test-uuid-123';

      const success = await repository.revokeApiKey(userId);

      expect(success).toBe(true);
      expect(mockDB.prepare).toHaveBeenCalledWith(
        'UPDATE users SET api_key_hash = NULL WHERE id = ?'
      );
    });

    it('should return false when no rows are affected', async () => {
      // Mock zero rows affected
      mockDB.prepare.mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({
            success: true,
            meta: { changes: 0 },
          }),
        }),
      });

      const userId = 'nonexistent-user';

      const success = await repository.revokeApiKey(userId);

      expect(success).toBe(false);
    });
  });
});
