import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateEntryHandler } from '../tools/update-entry.js';
import type { UpdateEntryParams } from '../types/index.js';

// Mock the repository
vi.mock('../repositories/index.js', () => ({
  FoodEntryRepository: vi.fn().mockImplementation(() => ({
    update: vi.fn().mockResolvedValue(true),
  })),
}));

describe('updateEntryHandler', () => {
  const mockEnv = {
    DB: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return auth error when userId is not provided', async () => {
    const params: UpdateEntryParams = {
      entry_id: 'entry-123',
      food_name: 'Updated Apple',
    };

    const result = await updateEntryHandler(params, undefined, mockEnv);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Authentication required');
  });

  it('should return error when database is not available', async () => {
    const params: UpdateEntryParams = {
      entry_id: 'entry-123',
      food_name: 'Updated Apple',
    };

    const result = await updateEntryHandler(params, 'user-123', {});

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Database not available');
  });

  it('should successfully update an entry', async () => {
    const params: UpdateEntryParams = {
      entry_id: 'entry-123',
      food_name: 'Updated Apple',
      calories: 90,
    };
    const userId = 'user-123';

    const result = await updateEntryHandler(params, userId, mockEnv);

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain(
      'Successfully updated entry entry-123'
    );
  });

  it('should return error when entry is not found', async () => {
    // Mock repository to return false (no rows affected)
    const { FoodEntryRepository } = await import('../repositories/index.js');
    vi.mocked(FoodEntryRepository).mockImplementation(
      () =>
        ({
          update: vi.fn().mockResolvedValue(false),
        } as any)
    );

    const params: UpdateEntryParams = {
      entry_id: 'entry-123',
      food_name: 'Updated Apple',
    };
    const userId = 'user-123';

    const result = await updateEntryHandler(params, userId, mockEnv);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain(
      'Entry entry-123 not found or you don\'t have permission to update it'
    );
  });

  it('should handle repository errors gracefully', async () => {
    // Mock repository to throw error
    const { FoodEntryRepository } = await import('../repositories/index.js');
    vi.mocked(FoodEntryRepository).mockImplementation(
      () =>
        ({
          update: vi.fn().mockRejectedValue(new Error('Database error')),
        } as any)
    );

    const params: UpdateEntryParams = {
      entry_id: 'entry-123',
      food_name: 'Updated Apple',
    };
    const userId = 'user-123';

    const result = await updateEntryHandler(params, userId, mockEnv);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Failed to update food entry');
  });
});
