import { UserProfile, ProfileTracking } from '../types/index.js';

/**
 * Activity level multipliers for TDEE calculation
 */
const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2, // Little to no exercise
  light: 1.375, // Light exercise 1-3 days/week
  moderate: 1.55, // Moderate exercise 3-5 days/week
  active: 1.725, // Heavy exercise 6-7 days/week
  very_active: 1.9, // Very heavy exercise, physical job
} as const;

/**
 * Calculate BMR using Harris-Benedict equation
 */
export function calculateBMR(
  weight_kg: number,
  height_cm: number,
  age: number,
  gender: 'male' | 'female'
): number {
  if (gender === 'male') {
    // BMR = 88.362 + (13.397 × weight in kg) + (4.799 × height in cm) - (5.677 × age in years)
    return Math.round(
      88.362 + 13.397 * weight_kg + 4.799 * height_cm - 5.677 * age
    );
  } else {
    // BMR = 447.593 + (9.247 × weight in kg) + (3.098 × height in cm) - (4.330 × age in years)
    return Math.round(
      447.593 + 9.247 * weight_kg + 3.098 * height_cm - 4.33 * age
    );
  }
}

/**
 * Calculate TDEE (Total Daily Energy Expenditure)
 */
export function calculateTDEE(
  bmr: number,
  activityLevel: keyof typeof ACTIVITY_MULTIPLIERS
): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel]);
}

/**
 * Calculate BMR and TDEE for a user profile with tracking data
 */
export function calculateProfileMetrics(
  profile: UserProfile,
  tracking?: ProfileTracking
): { bmr_calories?: number; tdee_calories?: number } {
  if (!tracking?.weight_kg) {
    return {};
  }

  const bmr = calculateBMR(
    tracking.weight_kg,
    profile.height_cm,
    profile.age,
    profile.gender
  );

  const tdee = calculateTDEE(bmr, profile.activity_level);

  return {
    bmr_calories: bmr,
    tdee_calories: tdee,
  };
}

/**
 * Validate weight value
 */
export function validateWeight(weight_kg: number): boolean {
  return weight_kg > 0 && weight_kg <= 1000; // Reasonable weight range
}

/**
 * Validate height value
 */
export function validateHeight(height_cm: number): boolean {
  return height_cm >= 50 && height_cm <= 300; // Reasonable height range
}

/**
 * Validate age value
 */
export function validateAge(age: number): boolean {
  return age >= 1 && age <= 150; // Reasonable age range
}

/**
 * Validate body fat percentage
 */
export function validateBodyFatPercentage(bodyFat: number): boolean {
  return bodyFat >= 0 && bodyFat <= 100;
}
