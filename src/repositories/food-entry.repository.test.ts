import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FoodEntryRepository } from '../repositories/food-entry.repository.js';
import type { AddEntryParams, UpdateEntryParams } from '../types/index.js';

// Mock database interface
const createMockDB = () => {
  const mockResult = { success: true, meta: { changes: 1 } };
  const mockRows = [
    {
      id: 'test-uuid-123',
      user_id: 'user-123',
      food_name: 'Apple',
      calories: 80,
      protein_g: 0.3,
      carbs_g: 21,
      fat_g: 0.2,
      meal_type: 'snack',
      entry_date: '2024-01-01',
      created_at: '2024-01-01T10:00:00Z',
    },
  ];

  const mockPrepare = vi.fn().mockReturnValue({
    bind: vi.fn().mockReturnValue({
      run: vi.fn().mockResolvedValue(mockResult),
      all: vi.fn().mockResolvedValue({ results: mockRows }),
      first: vi.fn().mockResolvedValue(mockRows[0]),
    }),
  });

  return {
    prepare: mockPrepare,
    mockResult,
    mockRows,
  };
};

describe('FoodEntryRepository', () => {
  let repository: FoodEntryRepository;
  let mockDB: ReturnType<typeof createMockDB>;

  beforeEach(() => {
    mockDB = createMockDB();
    repository = new FoodEntryRepository(mockDB);
  });

  describe('create', () => {
    it('should create a new food entry successfully', async () => {
      const entryData: AddEntryParams = {
        food_name: 'Apple',
        calories: 80,
        protein_g: 0.3,
        carbs_g: 21,
        fat_g: 0.2,
        meal_type: 'snack',
      };
      const userId = 'user-123';

      const entryId = await repository.create(entryData, userId);

      expect(entryId).toBe('test-uuid-123');
      expect(mockDB.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO food_entries')
      );
    });

    it('should use current date when entry_date is not provided', async () => {
      const entryData: AddEntryParams = {
        food_name: 'Apple',
        calories: 80,
      };
      const userId = 'user-123';

      await repository.create(entryData, userId);

      const bindCall = mockDB.prepare().bind;
      expect(bindCall).toHaveBeenCalledWith(
        'test-uuid-123',
        userId,
        'Apple',
        80,
        null,
        null,
        null,
        null,
        expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)
      );
    });
  });

  describe('findByUserAndDate', () => {
    it('should find entries for user and date', async () => {
      const params = { date: '2024-01-01', limit: 10, offset: 0 };
      const userId = 'user-123';

      const entries = await repository.findByUserAndDate(userId, params);

      expect(entries).toEqual(mockDB.mockRows);
      expect(mockDB.prepare).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM food_entries')
      );
    });

    it('should use current date when date is not provided', async () => {
      const params = { limit: 10, offset: 0 };
      const userId = 'user-123';

      await repository.findByUserAndDate(userId, params);

      const bindCall = mockDB.prepare().bind;
      expect(bindCall).toHaveBeenCalledWith(
        userId,
        null, // No date provided, so null is passed to let DB use CURRENT_DATE
        10,
        0
      );
    });
  });

  describe('update', () => {
    it('should update an existing entry successfully', async () => {
      const entryId = 'entry-123';
      const userId = 'user-123';
      const updateData: Omit<UpdateEntryParams, 'entry_id'> = {
        food_name: 'Updated Apple',
        calories: 90,
      };

      const success = await repository.update(entryId, userId, updateData);

      expect(success).toBe(true);
      expect(mockDB.prepare).toHaveBeenCalledWith(
        expect.stringMatching(/UPDATE food_entries\s+SET/)
      );
    });

    it('should return false when no rows are affected', async () => {
      // Mock zero rows affected
      mockDB.prepare.mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi
            .fn()
            .mockResolvedValue({ success: true, meta: { changes: 0 } }),
        }),
      });

      const entryId = 'entry-123';
      const userId = 'user-123';
      const updateData = { food_name: 'Updated Apple' };

      const success = await repository.update(entryId, userId, updateData);

      expect(success).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete an entry successfully', async () => {
      const entryId = 'entry-123';
      const userId = 'user-123';

      const success = await repository.delete(entryId, userId);

      expect(success).toBe(true);
      expect(mockDB.prepare).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM food_entries')
      );
    });

    it('should return false when no rows are affected', async () => {
      // Mock zero rows affected
      mockDB.prepare.mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi
            .fn()
            .mockResolvedValue({ success: true, meta: { changes: 0 } }),
        }),
      });

      const entryId = 'entry-123';
      const userId = 'user-123';

      const success = await repository.delete(entryId, userId);

      expect(success).toBe(false);
    });
  });
});
