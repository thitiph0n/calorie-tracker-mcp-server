import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserProfileRepository } from './user-profile.repository.js';

const mockDb = {
  prepare: (query: string) => ({
    bind: (...args: any[]) => ({
      first: () => Promise.resolve({ id: 'profile1', user_id: 'user1' }),
      all: () =>
        Promise.resolve({ results: [{ id: 'profile1', user_id: 'user1' }] }),
      run: () => Promise.resolve({ changes: 1, meta: { last_row_id: 1 } }),
    }),
  }),
};

describe('UserProfileRepository', () => {
  let repository: UserProfileRepository;

  beforeEach(() => {
    repository = new UserProfileRepository(mockDb);
  });

  describe('createProfile', () => {
    it('should prepare correct SQL for profile creation', async () => {
      const prepareSpy = vi.spyOn(mockDb, 'prepare');

      const profile = {
        user_id: 'user1',
        height_cm: 175,
        age: 30,
        gender: 'male' as const,
        activity_level: 'moderate' as const,
      };

      await repository.createProfile(profile);

      expect(prepareSpy).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_profiles')
      );
      expect(prepareSpy).toHaveBeenCalledWith(
        expect.stringContaining('height_cm, age, gender, activity_level')
      );
    });
  });

  describe('getProfileById', () => {
    it('should prepare correct SQL for profile retrieval with tracking data', async () => {
      const prepareSpy = vi.spyOn(mockDb, 'prepare');

      await repository.getProfileById('user1');

      expect(prepareSpy).toHaveBeenCalledWith(
        expect.stringContaining('LEFT JOIN profile_tracking')
      );
      expect(prepareSpy).toHaveBeenCalledWith(
        expect.stringContaining('WHERE up.user_id = ?')
      );
    });

    it('should return null when profile not found', async () => {
      // Mock null result for this specific test
      const mockDbWithNull = {
        prepare: () => ({
          bind: () => ({
            first: () => Promise.resolve(null),
          }),
        }),
      };
      const repoWithNull = new UserProfileRepository(mockDbWithNull);

      const result = await repoWithNull.getProfileById('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('updateProfile', () => {
    it('should prepare correct SQL for profile updates', async () => {
      const prepareSpy = vi.spyOn(mockDb, 'prepare');

      const updates = {
        height_cm: 180,
        age: 31,
      };

      await repository.updateProfile('user1', updates);

      expect(prepareSpy).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE user_profiles')
      );
      expect(prepareSpy).toHaveBeenCalledWith(
        expect.stringContaining('height_cm = ?')
      );
      expect(prepareSpy).toHaveBeenCalledWith(
        expect.stringContaining('age = ?')
      );
    });
  });

  describe('deleteProfile', () => {
    it('should prepare correct SQL for profile deletion', async () => {
      const prepareSpy = vi.spyOn(mockDb, 'prepare');

      await repository.deleteProfile('user1');

      expect(prepareSpy).toHaveBeenCalledWith(
        'DELETE FROM user_profiles WHERE user_id = ?'
      );
    });
  });
});
