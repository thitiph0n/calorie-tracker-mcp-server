import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listEntriesHandler } from '../tools/list-entries.js';
import type { ListEntriesParams } from '../types/index.js';

// Mock the repository
vi.mock('../repositories/index.js', () => ({
  FoodEntryRepository: vi.fn().mockImplementation(() => ({
    findByUserAndDate: vi.fn().mockResolvedValue([
      {
        id: 'entry-1',
        user_id: 'user-123',
        food_name: 'Apple',
        calories: 80,
        entry_date: '2024-01-01',
      },
      {
        id: 'entry-2',
        user_id: 'user-123',
        food_name: 'Banana',
        calories: 105,
        entry_date: '2024-01-01',
      },
    ]),
  })),
}));

describe('listEntriesHandler', () => {
  const mockEnv = {
    DB: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return auth error when userId is not provided', async () => {
    const params: ListEntriesParams = {
      date: '2024-01-01',
    };

    const result = await listEntriesHandler(params, undefined, mockEnv);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Authentication required');
  });

  it('should return error when database is not available', async () => {
    const params: ListEntriesParams = {
      date: '2024-01-01',
    };

    const result = await listEntriesHandler(params, 'user-123', {});

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Database not available');
  });

  it('should successfully list entries', async () => {
    const params: ListEntriesParams = {
      date: '2024-01-01',
      limit: 10,
      offset: 0,
    };
    const userId = 'user-123';

    const result = await listEntriesHandler(params, userId, mockEnv);

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain(
      'Found 2 entries for user user-123'
    );
    expect(result.content[0].text).toContain('Apple');
    expect(result.content[0].text).toContain('Banana');
  });

  it('should handle empty results', async () => {
    // Mock repository to return empty array
    const { FoodEntryRepository } = await import('../repositories/index.js');
    vi.mocked(FoodEntryRepository).mockImplementation(
      () =>
        ({
          findByUserAndDate: vi.fn().mockResolvedValue([]),
        } as any)
    );

    const params: ListEntriesParams = {
      date: '2024-01-01',
    };
    const userId = 'user-123';

    const result = await listEntriesHandler(params, userId, mockEnv);

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain(
      'Found 0 entries for user user-123'
    );
  });

  it('should handle repository errors gracefully', async () => {
    // Mock repository to throw error
    const { FoodEntryRepository } = await import('../repositories/index.js');
    vi.mocked(FoodEntryRepository).mockImplementation(
      () =>
        ({
          findByUserAndDate: vi
            .fn()
            .mockRejectedValue(new Error('Database error')),
        } as any)
    );

    const params: ListEntriesParams = {
      date: '2024-01-01',
    };
    const userId = 'user-123';

    const result = await listEntriesHandler(params, userId, mockEnv);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Failed to retrieve food entries');
  });
});
