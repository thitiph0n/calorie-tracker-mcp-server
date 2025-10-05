import { McpAgent } from 'agents/mcp';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { OAuthHandler, withOAuth } from './auth/oauth-provider.js';
import {
  listEntriesHandler,
  ListEntriesParams,
  addEntryHandler,
  AddEntryParams,
  updateEntryHandler,
  UpdateEntryParams,
  deleteEntryHandler,
  DeleteEntryParams,
  registerUserHandler,
  RegisterUserParams,
  revokeUserHandler,
  RevokeUserParams,
  getProfile,
  updateProfile,
  getProfileHistory,
  UpdateProfileParams,
  GetProfileHistoryParams,
} from './tools/index.js';
import z from 'zod';

type Props = {
  userId?: string;
  isAdmin: boolean;
};

// Define our authenticated MCP agent
export class CalorieTrackerMCP extends McpAgent<Env, {}, Props> {
  server = new McpServer({
    name: 'Calorie Tracker Server',
    version: '1.0.0',
  });

  async init() {
    // List daily entries
    this.server.tool(
      'list_entries',
      'List food entries for a specific date with pagination. Returns daily calorie intake and nutritional data.',
      {
        date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
          .optional()
          .describe('Date in YYYY-MM-DD format (optional, defaults to today)'),
        limit: z
          .number()
          .int()
          .min(1, 'Limit must be at least 1')
          .max(100, 'Maximum limit is 100')
          .default(10)
          .optional(),
        offset: z
          .number()
          .int()
          .min(0, 'Offset cannot be negative')
          .default(0)
          .optional(),
      },
      async (params) => {
        return listEntriesHandler(
          params as ListEntriesParams,
          this.props.userId,
          this.env
        );
      }
    );

    // Add new entry
    this.server.tool(
      'add_entry',
      'Add a new food entry to the calorie tracker',
      {
        food_name: z
          .string()
          .min(1, 'Food name is required')
          .describe('Name of the food item'),
        calories: z
          .number()
          .int()
          .min(0, 'Calories must be a non-negative integer')
          .describe('Number of calories'),
        protein_g: z
          .number()
          .min(0, 'Protein must be a non-negative number')
          .optional()
          .describe('Protein content in grams'),
        carbs_g: z
          .number()
          .min(0, 'Carbs must be a non-negative number')
          .optional()
          .describe('Carbohydrate content in grams'),
        fat_g: z
          .number()
          .min(0, 'Fat must be a non-negative number')
          .optional()
          .describe('Fat content in grams'),
        meal_type: z
          .enum(['breakfast', 'lunch', 'dinner', 'snack'])
          .optional()
          .describe('Type of meal'),
        entry_date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
          .optional()
          .describe('Date in YYYY-MM-DD format (defaults to today)'),
      },
      async (params) => {
        return addEntryHandler(
          params as AddEntryParams,
          this.props.userId,
          this.env
        );
      }
    );

    // Update entry
    this.server.tool(
      'update_entry',
      'Update an existing food entry',
      {
        entry_id: z
          .string()
          .min(1, 'Entry ID is required')
          .describe('ID of the food entry to update'),
        food_name: z
          .string()
          .min(1, 'Food name cannot be empty')
          .optional()
          .describe('Updated name of the food item'),
        calories: z
          .number()
          .int()
          .min(0, 'Calories must be a non-negative integer')
          .optional()
          .describe('Updated number of calories'),
        protein_g: z
          .number()
          .min(0, 'Protein must be a non-negative number')
          .optional()
          .describe('Updated protein content in grams'),
        carbs_g: z
          .number()
          .min(0, 'Carbs must be a non-negative number')
          .optional()
          .describe('Updated carbohydrate content in grams'),
        fat_g: z
          .number()
          .min(0, 'Fat must be a non-negative number')
          .optional()
          .describe('Updated fat content in grams'),
        meal_type: z
          .enum(['breakfast', 'lunch', 'dinner', 'snack'])
          .optional()
          .describe('Updated type of meal'),
      },
      async (params) => {
        return updateEntryHandler(
          params as UpdateEntryParams,
          this.props.userId,
          this.env
        );
      }
    );

    // Delete entry
    this.server.tool(
      'delete_entry',
      'Delete a food entry',
      {
        entry_id: z
          .string()
          .min(1, 'Entry ID is required')
          .describe('ID of the food entry to delete'),
      },
      async (params) => {
        return deleteEntryHandler(
          params as DeleteEntryParams,
          this.props.userId,
          this.env
        );
      }
    );

    // Register user (admin only)
    this.server.tool(
      'register_user',
      'Register a new user (admin only)',
      {
        email: z
          .string()
          .email('Invalid email format')
          .describe('Email address of the new user'),
        name: z
          .string()
          .min(1, 'Name is required')
          .describe('Full name of the new user'),
        is_admin: z
          .boolean()
          .default(false)
          .describe('Whether the user has admin privileges'),
      },
      async (params) => {
        return registerUserHandler(
          params as RegisterUserParams,
          this.props.userId,
          this.env,
          this.props.isAdmin
        );
      }
    );

    // Revoke user (admin only)
    this.server.tool(
      'revoke_user',
      'Revoke a user (admin only)',
      {
        user_id: z
          .string()
          .min(1, 'User ID is required')
          .describe('ID of the user to revoke'),
      },
      async (params) => {
        return revokeUserHandler(
          params as RevokeUserParams,
          this.props.userId,
          this.env,
          this.props.isAdmin
        );
      }
    );

    // Get user profile
    this.server.tool(
      'get_profile',
      'Get current user profile with calculated BMR/TDEE metrics',
      {},
      async (params) => {
        return getProfile(params, this.props.userId, this.env);
      }
    );

    // Update user profile
    this.server.tool(
      'update_profile',
      'Update user profile information and tracking data',
      {
        height_cm: z
          .number()
          .min(50, 'Height must be at least 50cm')
          .max(300, 'Height must be at most 300cm')
          .optional()
          .describe('Height in centimeters'),
        age: z
          .number()
          .int()
          .min(1, 'Age must be at least 1')
          .max(150, 'Age must be at most 150')
          .optional()
          .describe('Age in years'),
        gender: z
          .enum(['male', 'female'])
          .optional()
          .describe('Gender (male or female)'),
        activity_level: z
          .enum(['sedentary', 'light', 'moderate', 'active', 'very_active'])
          .optional()
          .describe('Activity level for TDEE calculation'),
        weight_kg: z
          .number()
          .min(1, 'Weight must be at least 1kg')
          .max(1000, 'Weight must be at most 1000kg')
          .optional()
          .describe('Current weight in kilograms'),
        muscle_mass_kg: z
          .number()
          .min(0, 'Muscle mass cannot be negative')
          .max(1000, 'Muscle mass must be at most 1000kg')
          .optional()
          .describe('Muscle mass in kilograms'),
        body_fat_percentage: z
          .number()
          .min(0, 'Body fat percentage cannot be negative')
          .max(100, 'Body fat percentage cannot exceed 100%')
          .optional()
          .describe('Body fat percentage (0-100)'),
      },
      async (params) => {
        return updateProfile(params as any, this.props.userId, this.env);
      }
    );

    // Get profile history
    this.server.tool(
      'get_profile_history',
      'Get historical profile tracking data with optional date filtering',
      {
        date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
          .optional()
          .describe('Specific date to filter by (YYYY-MM-DD format)'),
        start_date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
          .optional()
          .describe('Start date for date range filter (YYYY-MM-DD format)'),
        end_date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
          .optional()
          .describe('End date for date range filter (YYYY-MM-DD format)'),
        limit: z
          .number()
          .int()
          .min(1, 'Limit must be at least 1')
          .max(100, 'Maximum limit is 100')
          .default(10)
          .optional()
          .describe('Maximum number of entries to return'),
        offset: z
          .number()
          .int()
          .min(0, 'Offset cannot be negative')
          .default(0)
          .optional()
          .describe('Number of entries to skip for pagination'),
      },
      async (params) => {
        return getProfileHistory(params as any, this.props.userId, this.env);
      }
    );
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/signup') {
      return OAuthHandler.signup(request, env);
    }

    if (url.pathname === '/login') {
      return OAuthHandler.login(request, env);
    }

    if (url.pathname === '/oauth/authorize') {
      return OAuthHandler.authorize(request, env);
    }

    if (url.pathname === '/oauth/token') {
      return OAuthHandler.token(request, env);
    }

    if (url.pathname === '/oauth/register') {
      return OAuthHandler.register(request, env);
    }

    if (url.pathname === '/.well-known/oauth-authorization-server') {
      return OAuthHandler.metadata(request);
    }

    return withOAuth(request, env, ctx, async (request, env, ctx, userId, isAdmin) => {
      ctx.props = {
        userId,
        isAdmin,
      };

      if (url.pathname === '/sse' || url.pathname === '/sse/message') {
        return CalorieTrackerMCP.serveSSE('/sse').fetch(request, env, ctx);
      }

      if (url.pathname === '/mcp') {
        return CalorieTrackerMCP.serve('/mcp').fetch(request, env, ctx);
      }

      if (url.pathname === '/') {
        return new Response(
          `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Calorie Tracker MCP Server</title>
  <style>
    body { font-family: system-ui; max-width: 600px; margin: 100px auto; padding: 20px; }
    h1 { font-size: 32px; margin-bottom: 10px; }
    p { color: #666; margin-bottom: 30px; }
    a { display: inline-block; padding: 12px 24px; background: #000; color: white; text-decoration: none; border-radius: 5px; margin: 10px 10px 10px 0; }
    a:hover { background: #333; }
    .endpoints { margin-top: 40px; }
    .endpoint { padding: 10px; background: #f5f5f5; margin: 10px 0; border-radius: 5px; }
  </style>
</head>
<body>
  <h1>🍎 Calorie Tracker MCP Server</h1>
  <p>Track your daily calorie intake with Claude</p>

  <a href="/signup">Create Account</a>
  <a href="/login">Sign In</a>

  <div class="endpoints">
    <h2>API Endpoints</h2>
    <div class="endpoint"><strong>GET /signup</strong> - User registration</div>
    <div class="endpoint"><strong>GET /login</strong> - User login</div>
    <div class="endpoint"><strong>GET /sse</strong> - MCP SSE endpoint</div>
    <div class="endpoint"><strong>GET /oauth/authorize</strong> - OAuth authorization</div>
    <div class="endpoint"><strong>POST /oauth/token</strong> - OAuth token exchange</div>
    <div class="endpoint"><strong>POST /oauth/register</strong> - OAuth client registration</div>
    <div class="endpoint"><strong>GET /.well-known/oauth-authorization-server</strong> - OAuth metadata</div>
  </div>
</body>
</html>`,
          {
            status: 200,
            headers: { 'Content-Type': 'text/html' },
          }
        );
      }

      return new Response(
        JSON.stringify({
          message: 'Calorie Tracker API',
          endpoints: [
            { path: '/mcp', description: 'MCP endpoint (OAuth protected)' },
            { path: '/sse', description: 'SSE endpoint (OAuth protected)' },
            { path: '/oauth/authorize', description: 'OAuth authorization endpoint' },
            { path: '/oauth/token', description: 'OAuth token endpoint' },
            { path: '/oauth/register', description: 'OAuth client registration' },
            { path: '/.well-known/oauth-authorization-server', description: 'OAuth metadata' },
          ],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    });
  },
};
