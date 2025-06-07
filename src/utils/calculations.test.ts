import { describe, it, expect } from 'vitest';
import {
  calculateBMR,
  calculateTDEE,
  calculateProfileMetrics,
  validateWeight,
  validateHeight,
  validateAge,
  validateBodyFatPercentage,
} from './calculations.js';

describe('calculations', () => {
  describe('calculateBMR', () => {
    it('should calculate BMR correctly for males', () => {
      const bmr = calculateBMR(70, 175, 30, 'male');
      // BMR = 88.362 + (13.397 × 70) + (4.799 × 175) - (5.677 × 30)
      // BMR = 88.362 + 937.79 + 839.825 - 170.31 = 1695.667
      expect(bmr).toBe(1696); // Rounded
    });

    it('should calculate BMR correctly for females', () => {
      const bmr = calculateBMR(60, 165, 25, 'female');
      // BMR = 447.593 + (9.247 × 60) + (3.098 × 165) - (4.330 × 25)
      // BMR = 447.593 + 554.82 + 511.17 - 108.25 = 1405.333
      expect(bmr).toBe(1405); // Rounded
    });
  });

  describe('calculateTDEE', () => {
    it('should calculate TDEE correctly for sedentary activity', () => {
      const tdee = calculateTDEE(1500, 'sedentary');
      expect(tdee).toBe(1800); // 1500 * 1.2
    });

    it('should calculate TDEE correctly for moderate activity', () => {
      const tdee = calculateTDEE(1500, 'moderate');
      expect(tdee).toBe(2325); // 1500 * 1.55
    });

    it('should calculate TDEE correctly for very active', () => {
      const tdee = calculateTDEE(1500, 'very_active');
      expect(tdee).toBe(2850); // 1500 * 1.9
    });
  });

  describe('calculateProfileMetrics', () => {
    const profile = {
      user_id: 'user1',
      height_cm: 175,
      age: 30,
      gender: 'male' as const,
      activity_level: 'moderate' as const,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };

    it('should return empty object when no tracking weight provided', () => {
      const tracking = {
        id: 'track1',
        user_id: 'user1',
        recorded_date: '2024-01-01',
        created_at: '2024-01-01',
      };

      const result = calculateProfileMetrics(profile, tracking);
      expect(result).toEqual({});
    });

    it('should calculate BMR and TDEE when weight is provided', () => {
      const tracking = {
        id: 'track1',
        user_id: 'user1',
        weight_kg: 70,
        recorded_date: '2024-01-01',
        created_at: '2024-01-01',
      };

      const result = calculateProfileMetrics(profile, tracking);
      expect(result.bmr_calories).toBeDefined();
      expect(result.tdee_calories).toBeDefined();
      expect(typeof result.bmr_calories).toBe('number');
      expect(typeof result.tdee_calories).toBe('number');
    });
  });

  describe('validation functions', () => {
    describe('validateWeight', () => {
      it('should return true for valid weights', () => {
        expect(validateWeight(50)).toBe(true);
        expect(validateWeight(100)).toBe(true);
        expect(validateWeight(200)).toBe(true);
      });

      it('should return false for invalid weights', () => {
        expect(validateWeight(0)).toBe(false);
        expect(validateWeight(-10)).toBe(false);
        expect(validateWeight(1001)).toBe(false);
      });
    });

    describe('validateHeight', () => {
      it('should return true for valid heights', () => {
        expect(validateHeight(150)).toBe(true);
        expect(validateHeight(175)).toBe(true);
        expect(validateHeight(200)).toBe(true);
      });

      it('should return false for invalid heights', () => {
        expect(validateHeight(49)).toBe(false);
        expect(validateHeight(301)).toBe(false);
        expect(validateHeight(0)).toBe(false);
      });
    });

    describe('validateAge', () => {
      it('should return true for valid ages', () => {
        expect(validateAge(18)).toBe(true);
        expect(validateAge(30)).toBe(true);
        expect(validateAge(65)).toBe(true);
      });

      it('should return false for invalid ages', () => {
        expect(validateAge(0)).toBe(false);
        expect(validateAge(151)).toBe(false);
        expect(validateAge(-5)).toBe(false);
      });
    });

    describe('validateBodyFatPercentage', () => {
      it('should return true for valid body fat percentages', () => {
        expect(validateBodyFatPercentage(15)).toBe(true);
        expect(validateBodyFatPercentage(25.5)).toBe(true);
        expect(validateBodyFatPercentage(0)).toBe(true);
        expect(validateBodyFatPercentage(100)).toBe(true);
      });

      it('should return false for invalid body fat percentages', () => {
        expect(validateBodyFatPercentage(-1)).toBe(false);
        expect(validateBodyFatPercentage(101)).toBe(false);
      });
    });
  });
});
