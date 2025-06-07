import { z } from 'zod';
import { CallToolResult, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { ToolHandler } from '../types/index.js';
import {
  UserProfileRepository,
  ProfileTrackingRepository,
} from '../repositories/index.js';
import { calculateProfileMetrics } from '../utils/calculations.js';

const getProfileParamsSchema = z.object({});

export const getProfile: ToolHandler<
  z.infer<typeof getProfileParamsSchema>
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

  try {
    const userProfileRepo = new UserProfileRepository(env.DB);
    const trackingRepo = new ProfileTrackingRepository(env.DB);

    // Get user profile with latest tracking data
    const profile = await userProfileRepo.getProfileById(userId);

    if (!profile) {
      return {
        content: [
          {
            type: 'text',
            text: 'No profile found. Please create a profile first by updating your profile information.',
          },
        ],
        isError: false,
      };
    }

    // Calculate BMR/TDEE if we have tracking data
    let calculatedMetrics: { bmr_calories?: number; tdee_calories?: number } =
      {};
    if (profile.latest_tracking?.weight_kg) {
      calculatedMetrics = calculateProfileMetrics(
        profile,
        profile.latest_tracking
      );

      // Update the tracking record with calculated values if needed
      if (calculatedMetrics.bmr_calories && calculatedMetrics.tdee_calories) {
        if (
          profile.latest_tracking.bmr_calories !==
            calculatedMetrics.bmr_calories ||
          profile.latest_tracking.tdee_calories !==
            calculatedMetrics.tdee_calories
        ) {
          await trackingRepo.updateTracking(profile.latest_tracking.id, {
            bmr_calories: calculatedMetrics.bmr_calories,
            tdee_calories: calculatedMetrics.tdee_calories,
          });
        }
      }
    }

    const responseData = {
      profile: {
        user_id: profile.user_id,
        height_cm: profile.height_cm,
        age: profile.age,
        gender: profile.gender,
        activity_level: profile.activity_level,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
      },
      latest_tracking: profile.latest_tracking,
      calculated_metrics: calculatedMetrics,
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
    console.error('Error getting profile:', error);
    return {
      content: [
        {
          type: 'text',
          text: `Failed to get profile: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        },
      ],
      isError: true,
    };
  }
};
