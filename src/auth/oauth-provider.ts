import { OAuthProvider } from '@cloudflare/workers-oauth-provider';
import { CalorieTrackerMCP } from '../index.js';

async function hashSecret(secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(secret);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function verifyClient(
  env: Env,
  clientId: string,
  clientSecret: string
): Promise<{ userId: string; isAdmin: boolean } | null> {
  const secretHash = await hashSecret(clientSecret);

  const result = await env.DB.prepare(
    'SELECT user_id, is_admin FROM oauth_clients WHERE client_id = ? AND client_secret_hash = ?'
  )
    .bind(clientId, secretHash)
    .first();

  if (result) {
    return {
      userId: result.user_id as string,
      isAdmin: Boolean(result.is_admin),
    };
  }

  return null;
}

async function generateToken(): Promise<string> {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function storeToken(
  env: Env,
  token: string,
  clientId: string,
  userId: string,
  expiresIn: number = 3600
): Promise<void> {
  const tokenHash = await hashSecret(token);
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  await env.DB.prepare(
    'INSERT INTO oauth_tokens (token_hash, client_id, user_id, expires_at) VALUES (?, ?, ?, ?)'
  )
    .bind(tokenHash, clientId, userId, expiresAt)
    .run();
}

async function verifyToken(
  env: Env,
  token: string
): Promise<{ userId: string; isAdmin: boolean } | null> {
  const tokenHash = await hashSecret(token);

  const result = await env.DB.prepare(
    `SELECT t.user_id, c.is_admin
     FROM oauth_tokens t
     JOIN oauth_clients c ON t.client_id = c.client_id
     WHERE t.token_hash = ? AND datetime(t.expires_at) > datetime('now')`
  )
    .bind(tokenHash)
    .first();

  if (result) {
    return {
      userId: result.user_id as string,
      isAdmin: Boolean(result.is_admin),
    };
  }

  return null;
}

class OAuthHandler {
  static async authorize(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const clientId = url.searchParams.get('client_id');
    const redirectUri = url.searchParams.get('redirect_uri');
    const state = url.searchParams.get('state');
    const codeChallenge = url.searchParams.get('code_challenge');
    const codeChallengeMethod = url.searchParams.get('code_challenge_method');

    if (!redirectUri || !codeChallenge) {
      return new Response(
        JSON.stringify({ error: 'invalid_request' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (clientId) {
      const client = await env.DB.prepare(
        'SELECT * FROM oauth_clients WHERE client_id = ?'
      )
        .bind(clientId)
        .first();

      if (!client) {
        return new Response(
          JSON.stringify({ error: 'invalid_client' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    const baseUrl = `${url.protocol}//${url.host}`;
    const loginUrl = new URL('/login', baseUrl);
    loginUrl.searchParams.set('redirect_uri', redirectUri);
    loginUrl.searchParams.set('code_challenge', codeChallenge);
    if (state) loginUrl.searchParams.set('state', state);
    if (clientId) loginUrl.searchParams.set('client_id', clientId);
    if (codeChallengeMethod) loginUrl.searchParams.set('code_challenge_method', codeChallengeMethod);

    return Response.redirect(loginUrl.toString(), 302);
  }

  static async login(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'GET') {
      const redirectUri = url.searchParams.get('redirect_uri');
      const state = url.searchParams.get('state');

      return new Response(
        `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Calorie Tracker - Login</title>
  <style>
    body { font-family: system-ui; max-width: 400px; margin: 100px auto; padding: 20px; }
    h1 { font-size: 24px; margin-bottom: 10px; }
    p { color: #666; margin-bottom: 30px; }
    form { display: flex; flex-direction: column; gap: 15px; }
    input { padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 14px; }
    button { padding: 12px; background: #000; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; }
    button:hover { background: #333; }
    .error { color: red; font-size: 14px; }
  </style>
</head>
<body>
  <h1>🍎 Calorie Tracker</h1>
  <p>Sign in to connect with Claude</p>
  <form method="POST">
    <input type="email" name="email" placeholder="Email" required>
    <input type="password" name="password" placeholder="Password" required>
    <input type="hidden" name="redirect_uri" value="${redirectUri || ''}">
    <input type="hidden" name="code_challenge" value="${url.searchParams.get('code_challenge') || ''}">
    <input type="hidden" name="code_challenge_method" value="${url.searchParams.get('code_challenge_method') || ''}">
    <input type="hidden" name="state" value="${state || ''}">
    <input type="hidden" name="client_id" value="${url.searchParams.get('client_id') || ''}">
    <button type="submit">Sign In</button>
  </form>
  <p style="margin-top: 20px; text-align: center;">
    Don't have an account? <a href="/signup">Sign up</a>
  </p>
</body>
</html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    if (request.method === 'POST') {
      const formData = await request.formData();
      const email = formData.get('email') as string;
      const password = formData.get('password') as string;
      const redirectUri = formData.get('redirect_uri') as string;
      const codeChallenge = formData.get('code_challenge') as string;
      const codeChallengeMethod = formData.get('code_challenge_method') as string;
      const state = formData.get('state') as string;
      const clientId = formData.get('client_id') as string;

      const user = await env.DB.prepare('SELECT id FROM users WHERE email = ?')
        .bind(email)
        .first();

      if (!user) {
        return new Response('Invalid email or password', { status: 401 });
      }

      const passwordRecord = await env.DB.prepare('SELECT password_hash FROM user_passwords WHERE user_id = ?')
        .bind(user.id)
        .first();

      if (!passwordRecord) {
        return new Response('Invalid email or password', { status: 401 });
      }

      const passwordHash = await hashSecret(password);
      if (passwordHash !== passwordRecord.password_hash) {
        return new Response('Invalid email or password', { status: 401 });
      }

      const authCode = await generateToken();
      await env.OAUTH_KV.put(
        `auth_code:${authCode}`,
        JSON.stringify({
          clientId: clientId || 'public',
          redirectUri,
          codeChallenge,
          codeChallengeMethod,
          userId: user.id,
        }),
        { expirationTtl: 600 }
      );

      const redirectUrl = new URL(redirectUri);
      redirectUrl.searchParams.set('code', authCode);
      if (state) redirectUrl.searchParams.set('state', state);

      return Response.redirect(redirectUrl.toString(), 302);
    }

    return new Response('Method not allowed', { status: 405 });
  }

  static async signup(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'GET') {
      return new Response(
        `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Calorie Tracker - Sign Up</title>
  <style>
    body { font-family: system-ui; max-width: 400px; margin: 100px auto; padding: 20px; }
    h1 { font-size: 24px; margin-bottom: 10px; }
    p { color: #666; margin-bottom: 30px; }
    form { display: flex; flex-direction: column; gap: 15px; }
    input { padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 14px; }
    button { padding: 12px; background: #000; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; }
    button:hover { background: #333; }
    .success { color: green; font-size: 14px; margin-top: 20px; }
    .error { color: red; font-size: 14px; margin-top: 20px; }
    a { color: #000; }
  </style>
</head>
<body>
  <h1>🍎 Calorie Tracker</h1>
  <p>Create your account</p>
  <form method="POST">
    <input type="text" name="name" placeholder="Full Name" required>
    <input type="email" name="email" placeholder="Email" required>
    <input type="password" name="password" placeholder="Password" minlength="8" required>
    <button type="submit">Create Account</button>
  </form>
  <p style="margin-top: 20px; text-align: center;">
    Already have an account? <a href="/login">Sign in</a>
  </p>
</body>
</html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    if (request.method === 'POST') {
      const formData = await request.formData();
      const name = formData.get('name') as string;
      const email = formData.get('email') as string;
      const password = formData.get('password') as string;

      const existingUser = await env.DB.prepare('SELECT id FROM users WHERE email = ?')
        .bind(email)
        .first();

      if (existingUser) {
        return new Response(
          `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Error</title>
  <style>
    body { font-family: system-ui; max-width: 400px; margin: 100px auto; padding: 20px; }
    .error { color: red; }
    a { color: #000; }
  </style>
</head>
<body>
  <div class="error">Email already registered. <a href="/login">Sign in instead</a></div>
</body>
</html>`,
          { headers: { 'Content-Type': 'text/html' }, status: 400 }
        );
      }

      const passwordHash = await hashSecret(password);
      const userId = crypto.randomUUID();

      await env.DB.prepare(
        'INSERT INTO users (id, name, email, role, created_at) VALUES (?, ?, ?, ?, ?)'
      )
        .bind(userId, name, email, 'user', new Date().toISOString())
        .run();

      await env.DB.prepare(
        'INSERT INTO user_passwords (user_id, password_hash, created_at) VALUES (?, ?, ?)'
      )
        .bind(userId, passwordHash, new Date().toISOString())
        .run();

      return new Response(
        `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Success</title>
  <style>
    body { font-family: system-ui; max-width: 400px; margin: 100px auto; padding: 20px; }
    .success { color: green; }
    a { color: #000; text-decoration: none; display: inline-block; margin-top: 20px; padding: 12px 24px; background: #000; color: white; border-radius: 5px; }
  </style>
</head>
<body>
  <div class="success">
    <h1>✅ Account created!</h1>
    <p>You can now connect Calorie Tracker to Claude.</p>
  </div>
  <a href="/login">Continue to Sign In</a>
</body>
</html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    return new Response('Method not allowed', { status: 405 });
  }

  static async token(request: Request, env: Env): Promise<Response> {
    const formData = await request.formData();
    const grantType = formData.get('grant_type');
    const code = formData.get('code');
    const clientId = formData.get('client_id');
    const clientSecret = formData.get('client_secret');
    const codeVerifier = formData.get('code_verifier');

    if (grantType === 'authorization_code') {
      if (!code || !codeVerifier) {
        return new Response(
          JSON.stringify({ error: 'invalid_request' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const authData = await env.OAUTH_KV.get(`auth_code:${code}`, 'json') as any;
      if (!authData) {
        return new Response(
          JSON.stringify({ error: 'invalid_grant' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      let userId: string;
      let isAdmin = false;

      if (authData.clientId === 'public') {
        userId = authData.userId;
        const user = await env.DB.prepare('SELECT role FROM users WHERE id = ?')
          .bind(userId)
          .first();
        isAdmin = user?.role === 'admin';
      } else {
        if (!clientId || !clientSecret) {
          return new Response(
            JSON.stringify({ error: 'invalid_client' }),
            { status: 401, headers: { 'Content-Type': 'application/json' } }
          );
        }

        const clientAuth = await verifyClient(env, clientId as string, clientSecret as string);
        if (!clientAuth) {
          return new Response(
            JSON.stringify({ error: 'invalid_client' }),
            { status: 401, headers: { 'Content-Type': 'application/json' } }
          );
        }
        userId = clientAuth.userId;
        isAdmin = clientAuth.isAdmin;
      }

      const accessToken = await generateToken();
      const refreshToken = await generateToken();

      await storeToken(env, accessToken, authData.clientId, userId, 3600);
      await env.OAUTH_KV.delete(`auth_code:${code}`);

      return new Response(
        JSON.stringify({
          access_token: accessToken,
          token_type: 'Bearer',
          expires_in: 3600,
          refresh_token: refreshToken,
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'unsupported_grant_type' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  static async register(request: Request, env: Env): Promise<Response> {
    const apiKey = request.headers.get('X-API-Key');

    if (!apiKey || apiKey !== env.ADMIN_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'unauthorized', message: 'Admin API key required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json<{
      client_name: string;
      redirect_uris: string[];
      user_id: string;
      is_admin?: boolean;
    }>();

    if (!body.client_name || !body.redirect_uris || !body.user_id) {
      return new Response(
        JSON.stringify({ error: 'invalid_request' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const user = await env.DB.prepare('SELECT id, role FROM users WHERE id = ?')
      .bind(body.user_id)
      .first();

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'invalid_user' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const clientId = crypto.randomUUID();
    const clientSecret = await generateToken();
    const clientSecretHash = await hashSecret(clientSecret);

    await env.DB.prepare(
      `INSERT INTO oauth_clients
       (client_id, client_secret_hash, client_name, redirect_uris, user_id, is_admin)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
      .bind(
        clientId,
        clientSecretHash,
        body.client_name,
        JSON.stringify(body.redirect_uris),
        body.user_id,
        user.role === 'admin' ? 1 : 0
      )
      .run();

    return new Response(
      JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        client_name: body.client_name,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  static async metadata(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;

    return new Response(
      JSON.stringify({
        issuer: baseUrl,
        authorization_endpoint: `${baseUrl}/oauth/authorize`,
        token_endpoint: `${baseUrl}/oauth/token`,
        registration_endpoint: `${baseUrl}/oauth/register`,
        response_types_supported: ['code'],
        grant_types_supported: ['authorization_code', 'refresh_token'],
        token_endpoint_auth_methods_supported: ['client_secret_post'],
        code_challenge_methods_supported: ['S256'],
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600',
        },
      }
    );
  }
}

async function verifyBearerToken(
  env: Env,
  token: string
): Promise<{ userId: string; isAdmin: boolean } | null> {
  const tokenHash = await hashSecret(token);

  const result = await env.DB.prepare(
    'SELECT user_id, is_admin FROM oauth_clients WHERE client_secret_hash = ?'
  )
    .bind(tokenHash)
    .first();

  if (result) {
    return {
      userId: result.user_id as string,
      isAdmin: Boolean(result.is_admin),
    };
  }

  return null;
}

async function withOAuth(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  handler: (
    request: Request,
    env: Env,
    ctx: ExecutionContext,
    userId: string,
    isAdmin: boolean
  ) => Promise<Response>
): Promise<Response> {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const token = authHeader.substring(7);

  let authResult = await verifyToken(env, token);

  if (!authResult) {
    authResult = await verifyBearerToken(env, token);
  }

  if (!authResult) {
    return new Response(
      JSON.stringify({ error: 'Invalid or expired token' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return handler(request, env, ctx, authResult.userId, authResult.isAdmin);
}

export { OAuthHandler, withOAuth };
