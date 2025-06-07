import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProfileTrackingRepository } from './profile-tracking.repository.js';

const mockDb = {
  prepare: (query: string) => ({
    bind: (...args: any[]) => ({
      first: () => Promise.resolve({ id: 'tracking1', user_id: 'user1' }),
      all: () =>
        Promise.resolve({ results: [{ id: 'tracking1', user_id: 'user1' }] }),
      run: () => Promise.resolve({ changes: 1, meta: { last_row_id: 1 } }),
    }),
  }),
};

describe('ProfileTrackingRepository', () => {
  let repository: ProfileTrackingRepository;

  beforeEach(() => {
    repository = new ProfileTrackingRepository(mockDb);
  });

  describe('createTracking', () => {
    it('should prepare correct SQL for tracking creation', async () => {
      const prepareSpy = vi.spyOn(mockDb, 'prepare');

      const tracking = {
        user_id: 'user1',
        weight_kg: 70,
        recorded_date: '2024-01-01',
      };

      await repository.createTracking(tracking);

      expect(prepareSpy).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO profile_tracking')
      );
      expect(prepareSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'weight_kg, muscle_mass_kg, body_fat_percentage'
        )
      );
    });
  });

  describe('getTrackingByUserId', () => {
    it('should prepare correct SQL for basic tracking retrieval', async () => {
      const prepareSpy = vi.spyOn(mockDb, 'prepare');

      await repository.getTrackingByUserId('user1');

      expect(prepareSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'SELECT * FROM profile_tracking WHERE user_id = ?'
        )
      );
      expect(prepareSpy).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY recorded_date DESC')
      );
    });

    it('should add date filter when provided', async () => {
      const prepareSpy = vi.spyOn(mockDb, 'prepare');

      await repository.getTrackingByUserId('user1', { date: '2024-01-01' });

      expect(prepareSpy).toHaveBeenCalledWith(
        expect.stringContaining('AND recorded_date = ?')
      );
    });

    it('should add date range filters when provided', async () => {
      const prepareSpy = vi.spyOn(mockDb, 'prepare');

      await repository.getTrackingByUserId('user1', {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });

      expect(prepareSpy).toHaveBeenCalledWith(
        expect.stringContaining('AND recorded_date >= ?')
      );
      expect(prepareSpy).toHaveBeenCalledWith(
        expect.stringContaining('AND recorded_date <= ?')
      );
    });

    it('should add limit and offset when provided', async () => {
      const prepareSpy = vi.spyOn(mockDb, 'prepare');

      await repository.getTrackingByUserId('user1', { limit: 10, offset: 5 });

      expect(prepareSpy).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT ?')
      );
      expect(prepareSpy).toHaveBeenCalledWith(
        expect.stringContaining('OFFSET ?')
      );
    });
  });

  describe('getLatestTracking', () => {
    it('should prepare correct SQL for latest tracking retrieval', async () => {
      const prepareSpy = vi.spyOn(mockDb, 'prepare');

      await repository.getLatestTracking('user1');

      expect(prepareSpy).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY recorded_date DESC, created_at DESC')
      );
      expect(prepareSpy).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 1')
      );
    });
  });

  describe('updateTracking', () => {
    it('should prepare correct SQL for tracking updates', async () => {
      const prepareSpy = vi.spyOn(mockDb, 'prepare');

      const updates = {
        weight_kg: 72,
        bmr_calories: 1800,
      };

      await repository.updateTracking('tracking1', updates);

      expect(prepareSpy).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE profile_tracking')
      );
      expect(prepareSpy).toHaveBeenCalledWith(
        expect.stringContaining('weight_kg = ?')
      );
      expect(prepareSpy).toHaveBeenCalledWith(
        expect.stringContaining('bmr_calories = ?')
      );
    });
  });

  describe('getTrackingByDate', () => {
    it('should prepare correct SQL for date-specific tracking retrieval', async () => {
      const prepareSpy = vi.spyOn(mockDb, 'prepare');

      await repository.getTrackingByDate('user1', '2024-01-01');

      expect(prepareSpy).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = ? AND recorded_date = ?')
      );
      expect(prepareSpy).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at DESC')
      );
    });
  });
});
