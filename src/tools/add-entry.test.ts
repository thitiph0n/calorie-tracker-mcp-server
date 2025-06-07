import { describe, it, expect, vi, beforeEach } from 'vitest';
import { addEntryHandler } from '../tools/add-entry.js';
import type { AddEntryParams } from '../types/index.js';

// Mock the repository
vi.mock('../repositories/index.js', () => ({
  FoodEntryRepository: vi.fn().mockImplementation(() => ({
    create: vi.fn().mockResolvedValue('test-entry-id'),
  })),
}));

describe('addEntryHandler', () => {
  const mockEnv = {
    DB: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return auth error when userId is not provided', async () => {
    const params: AddEntryParams = {
      food_name: 'Apple',
      calories: 80,
    };

    const result = await addEntryHandler(params, undefined, mockEnv);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Authentication required');
  });

  it('should return error when database is not available', async () => {
    const params: AddEntryParams = {
      food_name: 'Apple',
      calories: 80,
    };

    const result = await addEntryHandler(params, 'user-123', {});

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Database not available');
  });

  it('should successfully add an entry', async () => {
    const params: AddEntryParams = {
      food_name: 'Apple',
      calories: 80,
      protein_g: 0.3,
      meal_type: 'snack',
    };
    const userId = 'user-123';

    const result = await addEntryHandler(params, userId, mockEnv);

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain('Successfully added "Apple"');
    expect(result.content[0].text).toContain('80 calories');
    expect(result.content[0].text).toContain('test-entry-id');
  });

  it('should handle repository errors gracefully', async () => {
    // Mock repository to throw error
    const { FoodEntryRepository } = await import('../repositories/index.js');
    vi.mocked(FoodEntryRepository).mockImplementation(
      () =>
        ({
          create: vi.fn().mockRejectedValue(new Error('Database error')),
        } as any)
    );

    const params: AddEntryParams = {
      food_name: 'Apple',
      calories: 80,
    };
    const userId = 'user-123';

    const result = await addEntryHandler(params, userId, mockEnv);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Failed to add food entry');
  });
});
