import { z } from 'zod';
import { CallToolResult, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { ToolHandler, GetProfileHistoryParams } from '../types/index.js';
import { ProfileTrackingRepository } from '../repositories/index.js';

const getProfileHistoryParamsSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  start_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  end_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  limit: z.number().min(1).max(100).optional().default(10),
  offset: z.number().min(0).optional().default(0),
});

export const getProfileHistory: ToolHandler<
  z.infer<typeof getProfileHistoryParamsSchema>
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
    const validatedParams = getProfileHistoryParamsSchema.parse(params);

    // Validate date range
    if (validatedParams.start_date && validatedParams.end_date) {
      const startDate = new Date(validatedParams.start_date);
      const endDate = new Date(validatedParams.end_date);

      if (startDate > endDate) {
        return {
          content: [
            {
              type: 'text',
              text: 'start_date cannot be later than end_date',
            },
          ],
          isError: true,
        };
      }
    }

    // Cannot use date with start_date/end_date
    if (
      validatedParams.date &&
      (validatedParams.start_date || validatedParams.end_date)
    ) {
      return {
        content: [
          {
            type: 'text',
            text: 'Cannot use date parameter with start_date or end_date. Use either date for specific day or start_date/end_date for range.',
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

    const trackingRepo = new ProfileTrackingRepository(env.DB);

    const options = {
      date: validatedParams.date,
      startDate: validatedParams.start_date,
      endDate: validatedParams.end_date,
      limit: validatedParams.limit,
      offset: validatedParams.offset,
    };

    const trackingHistory = await trackingRepo.getTrackingByUserId(
      userId,
      options
    );

    // Calculate statistics if we have data
    let statistics: any = null;
    if (trackingHistory.length > 0) {
      const weights = trackingHistory
        .map((t) => t.weight_kg)
        .filter((w) => w !== null && w !== undefined) as number[];

      const bodyFats = trackingHistory
        .map((t) => t.body_fat_percentage)
        .filter((bf) => bf !== null && bf !== undefined) as number[];

      const muscleMasses = trackingHistory
        .map((t) => t.muscle_mass_kg)
        .filter((mm) => mm !== null && mm !== undefined) as number[];

      if (weights.length > 0) {
        statistics = {
          weight: {
            current: weights[0], // Most recent (first in DESC order)
            min: Math.min(...weights),
            max: Math.max(...weights),
            average:
              Math.round(
                (weights.reduce((a, b) => a + b, 0) / weights.length) * 100
              ) / 100,
            entries_count: weights.length,
          },
        };

        if (bodyFats.length > 0) {
          statistics.body_fat = {
            current: bodyFats[0],
            min: Math.min(...bodyFats),
            max: Math.max(...bodyFats),
            average:
              Math.round(
                (bodyFats.reduce((a, b) => a + b, 0) / bodyFats.length) * 100
              ) / 100,
            entries_count: bodyFats.length,
          };
        }

        if (muscleMasses.length > 0) {
          statistics.muscle_mass = {
            current: muscleMasses[0],
            min: Math.min(...muscleMasses),
            max: Math.max(...muscleMasses),
            average:
              Math.round(
                (muscleMasses.reduce((a, b) => a + b, 0) /
                  muscleMasses.length) *
                  100
              ) / 100,
            entries_count: muscleMasses.length,
          };
        }
      }
    }

    const responseData = {
      tracking_history: trackingHistory,
      statistics,
      query_info: {
        total_entries: trackingHistory.length,
        date_filter: validatedParams.date,
        date_range:
          validatedParams.start_date && validatedParams.end_date
            ? {
                start: validatedParams.start_date,
                end: validatedParams.end_date,
              }
            : null,
        limit: validatedParams.limit,
        offset: validatedParams.offset,
      },
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
    console.error('Error getting profile history:', error);

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
          text: `Failed to get profile history: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        },
      ],
      isError: true,
    };
  }
};
