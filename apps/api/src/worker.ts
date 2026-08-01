import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from './routers/_app.js';
import { createEdgeContext } from './trpc/edge-context.js';
import { inngest } from './inngest/client.js';
import { functions } from './inngest/index.js';
import { serve } from 'inngest/cloudflare';

export interface WorkerEnv {
  MONEY_MATTERS_APP_ID: string;
  STORAGE_BUCKET_NAME: string;
  STORAGE_ENDPOINT: string;
  STORAGE_REGION: string;
  GLOBAL_MAX_FILE_SIZE_MB: string;
  NEXT_PUBLIC_NEON_AUTH_URL: string;
  NEON_AUTH_BASE_URL: string;
  NEON_AUTH_JWKS_URL: string;
  DATABASE_URL?: string;
  INNGEST_SIGNING_KEY?: string;
  INNGEST_EVENT_KEY?: string;
  RESEND_API_KEY?: string;
}

export default {
  async fetch(request: Request, env: WorkerEnv, ctx: { waitUntil: (promise: Promise<unknown>) => void }): Promise<Response> {
    const url = new URL(request.url);

    // 1. Handle CORS Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, trpc-accept, x-correlation-id',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // 2. Handle Health Check Endpoint
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // 3. Handle Inngest Webhook Endpoint
    if (url.pathname.startsWith('/api/inngest')) {
      const inngestHandler = serve({
        client: inngest,
        functions,
        servePath: '/api/inngest',
        signingKey: env.INNGEST_SIGNING_KEY,
      }) as unknown as (
        request: Request,
        env: Record<string, string | undefined>,
        ctx?: { waitUntil: (promise: Promise<unknown>) => void }
      ) => Promise<Response>;
      return inngestHandler(request, env as unknown as Record<string, string | undefined>, ctx);
    }

    // 3. Handle Password Reset HTML Endpoint
    if (url.pathname === '/reset-password') {
      const token = url.searchParams.get('token') || '';
      const error = url.searchParams.get('error') || '';
      const redirectTo = url.searchParams.get('redirect_to') || 'moneymatters://reset-password';

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Password | Money Matters</title>
  <style>
    body { font-family: sans-serif; background-color: #0b132b; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: rgba(27, 43, 75, 0.4); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 24px; padding: 40px; max-width: 420px; text-align: center; }
    .btn { display: inline-block; width: 100%; padding: 16px; background-color: #3b82f6; color: #fff; text-decoration: none; font-weight: 600; border-radius: 14px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Money Matters</h1>
    <p>Your password reset link is ready. Tap below to launch the application.</p>
    <a href="#" id="openAppBtn" class="btn">Open Money Matters App</a>
  </div>
  <script>
    const token = ${JSON.stringify(token)};
    const error = ${JSON.stringify(error)};
    const baseRedirect = ${JSON.stringify(redirectTo)};
    let targetUrl = baseRedirect;
    if (targetUrl.includes('?')) {
      if (error) targetUrl += '&error=' + encodeURIComponent(error);
      if (token) targetUrl += '&token=' + encodeURIComponent(token);
    } else {
      if (error) { targetUrl += '?error=' + encodeURIComponent(error); }
      else if (token) { targetUrl += '?token=' + encodeURIComponent(token); }
    }
    document.getElementById('openAppBtn').href = targetUrl;
    window.location.href = targetUrl;
  </script>
</body>
</html>`;

      return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // 4. Handle tRPC Requests
    if (url.pathname.startsWith('/trpc')) {
      const response = await fetchRequestHandler({
        endpoint: '/trpc',
        req: request,
        router: appRouter,
        createContext: createEdgeContext,
      });

      const newHeaders = new Headers(response.headers);
      newHeaders.set('Access-Control-Allow-Origin', '*');
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    }

    return new Response('Not Found', { status: 404 });
  },
};
