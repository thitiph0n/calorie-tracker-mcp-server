import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deleteEntryHandler } from '../tools/delete-entry.js';
import type { DeleteEntryParams } from '../types/index.js';

// Mock the repository
vi.mock('../repositories/index.js', () => ({
  FoodEntryRepository: vi.fn().mockImplementation(() => ({
    delete: vi.fn().mockResolvedValue(true),
  })),
}));

describe('deleteEntryHandler', () => {
  const mockEnv = {
    DB: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return auth error when userId is not provided', async () => {
    const params: DeleteEntryParams = {
      entry_id: 'entry-123',
    };

    const result = await deleteEntryHandler(params, undefined, mockEnv);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Authentication required');
  });

  it('should return error when database is not available', async () => {
    const params: DeleteEntryParams = {
      entry_id: 'entry-123',
    };

    const result = await deleteEntryHandler(params, 'user-123', {});

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Database not available');
  });

  it('should successfully delete an entry', async () => {
    const params: DeleteEntryParams = {
      entry_id: 'entry-123',
    };
    const userId = 'user-123';

    const result = await deleteEntryHandler(params, userId, mockEnv);

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain(
      'Successfully deleted entry entry-123'
    );
  });

  it('should return error when entry is not found', async () => {
    // Mock repository to return false (no rows affected)
    const { FoodEntryRepository } = await import('../repositories/index.js');
    vi.mocked(FoodEntryRepository).mockImplementation(
      () =>
        ({
          delete: vi.fn().mockResolvedValue(false),
        } as any)
    );

    const params: DeleteEntryParams = {
      entry_id: 'entry-123',
    };
    const userId = 'user-123';

    const result = await deleteEntryHandler(params, userId, mockEnv);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain(
      'Entry entry-123 not found or you don\'t have permission to delete it'
    );
  });

  it('should handle repository errors gracefully', async () => {
    // Mock repository to throw error
    const { FoodEntryRepository } = await import('../repositories/index.js');
    vi.mocked(FoodEntryRepository).mockImplementation(
      () =>
        ({
          delete: vi.fn().mockRejectedValue(new Error('Database error')),
        } as any)
    );

    const params: DeleteEntryParams = {
      entry_id: 'entry-123',
    };
    const userId = 'user-123';

    const result = await deleteEntryHandler(params, userId, mockEnv);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Failed to delete food entry');
  });
});
