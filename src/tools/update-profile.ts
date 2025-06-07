import { z } from 'zod';
import { CallToolResult, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { ToolHandler, UpdateProfileParams } from '../types/index.js';
import {
  UserProfileRepository,
  ProfileTrackingRepository,
} from '../repositories/index.js';
import {
  calculateProfileMetrics,
  validateWeight,
  validateHeight,
  validateAge,
  validateBodyFatPercentage,
} from '../utils/calculations.js';

const updateProfileParamsSchema = z.object({
  height_cm: z.number().min(50).max(300).optional(),
  age: z.number().min(1).max(150).optional(),
  gender: z.enum(['male', 'female']).optional(),
  activity_level: z
    .enum(['sedentary', 'light', 'moderate', 'active', 'very_active'])
    .optional(),
  weight_kg: z.number().min(1).max(1000).optional(),
  muscle_mass_kg: z.number().min(0).max(1000).optional(),
  body_fat_percentage: z.number().min(0).max(100).optional(),
});

export const updateProfile: ToolHandler<
  z.infer<typeof updateProfileParamsSchema>
> = async (params, userId, env) => {
  if (!userId) {
    return {
      content: [
        {
          type: 'text',
          text: 'Authentication required',
        },
      ],
      isError: true,
    };
  }

  try {
    // Validate input parameters
    const validatedParams = updateProfileParamsSchema.parse(params);

    // Additional validation
    if (
      validatedParams.weight_kg &&
      !validateWeight(validatedParams.weight_kg)
    ) {
      return {
        content: [
          {
            type: 'text',
            text: 'Invalid weight. Must be between 1 and 1000 kg.',
          },
        ],
        isError: true,
      };
    }

    if (
      validatedParams.height_cm &&
      !validateHeight(validatedParams.height_cm)
    ) {
      return {
        content: [
          {
            type: 'text',
            text: 'Invalid height. Must be between 50 and 300 cm.',
          },
        ],
        isError: true,
      };
    }

    if (validatedParams.age && !validateAge(validatedParams.age)) {
      return {
        content: [
          {
            type: 'text',
            text: 'Invalid age. Must be between 1 and 150 years.',
          },
        ],
        isError: true,
      };
    }

    if (
      validatedParams.body_fat_percentage &&
      !validateBodyFatPercentage(validatedParams.body_fat_percentage)
    ) {
      return {
        content: [
          {
            type: 'text',
            text: 'Invalid body fat percentage. Must be between 0 and 100.',
          },
        ],
        isError: true,
      };
    }

    if (!env?.DB) {
      return {
        content: [
          {
            type: 'text',
            text: 'Database not available',
          },
        ],
        isError: true,
      };
    }

    const userProfileRepo = new UserProfileRepository(env.DB);
    const trackingRepo = new ProfileTrackingRepository(env.DB);

    // Get existing profile or create basic profile fields
    let profile = await userProfileRepo.getProfileById(userId);

    // Extract profile fields vs tracking fields
    const profileFields = {
      height_cm: validatedParams.height_cm,
      age: validatedParams.age,
      gender: validatedParams.gender,
      activity_level: validatedParams.activity_level,
    };

    const trackingFields = {
      weight_kg: validatedParams.weight_kg,
      muscle_mass_kg: validatedParams.muscle_mass_kg,
      body_fat_percentage: validatedParams.body_fat_percentage,
    };

    // Handle profile creation/update
    if (!profile) {
      // Need at least basic profile info to create
      if (
        !profileFields.height_cm ||
        !profileFields.age ||
        !profileFields.gender
      ) {
        return {
          content: [
            {
              type: 'text',
              text: 'Profile not found. Please provide height_cm, age, and gender to create a new profile.',
            },
          ],
          isError: true,
        };
      }

      // Create new profile
      profile = await userProfileRepo.createProfile({
        user_id: userId,
        height_cm: profileFields.height_cm,
        age: profileFields.age,
        gender: profileFields.gender,
        activity_level: profileFields.activity_level || 'sedentary',
      });
    } else {
      // Update existing profile if any profile fields provided
      const hasProfileUpdates = Object.values(profileFields).some(
        (val) => val !== undefined
      );
      if (hasProfileUpdates) {
        const filteredProfileFields = Object.fromEntries(
          Object.entries(profileFields).filter(
            ([_, value]) => value !== undefined
          )
        );
        profile = await userProfileRepo.updateProfile(
          userId,
          filteredProfileFields
        );
      }
    }

    // Handle tracking data
    let trackingEntry = null;
    const hasTrackingData = Object.values(trackingFields).some(
      (val) => val !== undefined
    );

    if (hasTrackingData) {
      const today = new Date().toISOString().split('T')[0];

      // Check if tracking entry exists for today
      const existingTracking = await trackingRepo.getTrackingByDate(
        userId,
        today
      );

      if (existingTracking) {
        // Update existing tracking entry
        const filteredTrackingFields = Object.fromEntries(
          Object.entries(trackingFields).filter(
            ([_, value]) => value !== undefined
          )
        );
        trackingEntry = await trackingRepo.updateTracking(
          existingTracking.id,
          filteredTrackingFields
        );
      } else {
        // Create new tracking entry
        trackingEntry = await trackingRepo.createTracking({
          user_id: userId,
          recorded_date: today,
          ...trackingFields,
        });
      }

      // Calculate and update BMR/TDEE if we have weight
      if (trackingEntry.weight_kg) {
        const calculations = calculateProfileMetrics(profile, trackingEntry);
        if (calculations.bmr_calories && calculations.tdee_calories) {
          trackingEntry = await trackingRepo.updateTracking(trackingEntry.id, {
            bmr_calories: calculations.bmr_calories,
            tdee_calories: calculations.tdee_calories,
          });
        }
      }
    }

    // Get updated profile with latest tracking
    const updatedProfile = await userProfileRepo.getProfileById(userId);

    if (!updatedProfile) {
      throw new Error('Failed to retrieve updated profile');
    }

    const responseData = {
      profile: {
        user_id: updatedProfile.user_id,
        height_cm: updatedProfile.height_cm,
        age: updatedProfile.age,
        gender: updatedProfile.gender,
        activity_level: updatedProfile.activity_level,
        updated_at: updatedProfile.updated_at,
      },
      latest_tracking: updatedProfile.latest_tracking,
      message: 'Profile updated successfully',
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(responseData, null, 2),
        },
      ],
      isError: false,
    };
  } catch (error) {
    console.error('Error updating profile:', error);

    if (error instanceof z.ZodError) {
      return {
        content: [
          {
            type: 'text',
            text: `Validation error: ${error.errors
              .map((e) => `${e.path.join('.')}: ${e.message}`)
              .join(', ')}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `Failed to update profile: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        },
      ],
      isError: true,
    };
  }
};
