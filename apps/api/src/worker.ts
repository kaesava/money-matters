import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from './routers/index.js'; // Adjust to point to appRouter
import { createEdgeContext } from './trpc/edge-context.js';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // 1. Handle CORS preflight requests from Render / Mobile apps
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, trpc-accept',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // 2. Route tRPC requests
    if (url.pathname.startsWith('/trpc')) {
      const response = await fetchRequestHandler({
        endpoint: '/trpc',
        req: request,
        router: appRouter,
        createContext: createEdgeContext,
      });

      // Append CORS headers to the response
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
