// Utility function to hash API keys using SHA-256
export async function hashApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Database-driven authentication with role-based access control
export async function authenticateRequest(
  request: Request,
  env?: Env
): Promise<{ userId: string; isAdmin: boolean } | null> {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  // Hash the provided token for comparison
  const hashedToken = await hashApiKey(token);

  // Query the users table using hashed API keys and check role
  if (env?.DB) {
    try {
      const result = await env.DB.prepare(
        'SELECT id, role FROM users WHERE api_key_hash = ?'
      )
        .bind(hashedToken)
        .first();

      if (result) {
        const isAdmin = result.role === 'admin';
        return { userId: result.id as string, isAdmin };
      }
    } catch (error) {
      console.error('Database authentication error:', error);
      return null;
    }
  }

  // No authentication found
  return null;
}

// Middleware function to wrap around fetch handler
export function withAuth(
  handler: (
    request: Request,
    env: Env,
    ctx: ExecutionContext,
    userId: string,
    isAdmin: boolean
  ) => Promise<Response>
) {
  return async (
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> => {
    const authResult = await authenticateRequest(request, env);

    if (!authResult) {
      return new Response(
        JSON.stringify({
          error:
            'Unauthorized. Please provide a valid API key in the Authorization header.',
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return handler(request, env, ctx, authResult.userId, authResult.isAdmin);
  };
}
