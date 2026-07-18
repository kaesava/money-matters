import fastify from 'fastify';
import cors from '@fastify/cors';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';
import { appRouter } from './routers/_app.js';
import { createContext } from './trpc/context.js';
import { inngest } from "./inngest/client.js";
import { functions } from "./inngest/index.js";
import { serve } from "inngest/fastify";
import { validateEnv } from '@money-matters/config';
import { logger, correlationIdHook, rateLimiter } from '@money-matters/core';

// Validate env vars first to fail fast if config targets are invalid/missing
const env = validateEnv();

const server = fastify({ 
  maxParamLength: 5000,
  logger: logger 
});

// Configure correlation ID tracking and rate limiting limits securely
server.addHook("onRequest", correlationIdHook);
server.register(rateLimiter);

server.register(cors, { origin: true, credentials: true });

server.register(fastifyTRPCPlugin, {
  prefix: '/trpc',
  trpcOptions: { router: appRouter, createContext },
});

server.route({
  method: ["GET", "POST", "PUT"],
  handler: serve({ client: inngest, functions }),
  url: "/api/inngest",
});

server.get('/reset-password', async (request, reply) => {
  const query = request.query as Record<string, string>;
  const token = query['token'] || '';
  const error = query['error'] || '';
  const redirectTo = query['redirect_to'] || 'moneymatters://reset-password';
  
  reply.type('text/html').send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Password | Money Matters</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          :root {
            --bg-color: #0b132b;
            --card-bg: rgba(27, 43, 75, 0.4);
            --text-primary: #ffffff;
            --text-secondary: #94a3b8;
            --accent: #3b82f6;
            --accent-hover: #2563eb;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: 'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background-color: var(--bg-color);
            color: var(--text-primary);
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 20px;
            overflow: hidden;
            position: relative;
          }
          /* Animated glowing background */
          .bg-glow {
            position: absolute;
            width: 300px;
            height: 300px;
            background: radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, rgba(0,0,0,0) 70%);
            top: 20%;
            left: 30%;
            z-index: 1;
            filter: blur(40px);
            animation: float 8s ease-in-out infinite;
          }
          .bg-glow-2 {
            position: absolute;
            width: 350px;
            height: 350px;
            background: radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, rgba(0,0,0,0) 70%);
            bottom: 15%;
            right: 25%;
            z-index: 1;
            filter: blur(50px);
            animation: float 12s ease-in-out infinite reverse;
          }
          @keyframes float {
            0%, 100% { transform: translateY(0) scale(1); }
            50% { transform: translateY(-20px) scale(1.1); }
          }
          .card {
            background: var(--card-bg);
            border: 1px solid rgba(255, 255, 255, 0.08);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border-radius: 24px;
            padding: 40px 32px;
            width: 100%;
            max-width: 420px;
            text-align: center;
            z-index: 10;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
          }
          .logo-icon {
            width: 64px;
            height: 64px;
            background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
            border-radius: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px;
            font-size: 28px;
            font-weight: 700;
            color: #ffffff;
            box-shadow: 0 8px 16px rgba(59, 130, 246, 0.3);
          }
          h1 {
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 12px;
            letter-spacing: -0.5px;
          }
          p {
            font-size: 15px;
            color: var(--text-secondary);
            line-height: 1.6;
            margin-bottom: 32px;
          }
          .btn {
            display: inline-block;
            width: 100%;
            padding: 16px 24px;
            background-color: var(--accent);
            color: #ffffff;
            text-decoration: none;
            font-weight: 600;
            font-size: 16px;
            border-radius: 14px;
            transition: all 0.2s ease-in-out;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
          }
          .btn:hover, .btn:active {
            background-color: var(--accent-hover);
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(59, 130, 246, 0.3);
          }
          .footer-text {
            font-size: 13px;
            color: #64748b;
            margin-top: 24px;
            line-height: 1.5;
          }
        </style>
      </head>
      <body>
        <div class="bg-glow"></div>
        <div class="bg-glow-2"></div>
        
        <div class="card">
          <div class="logo-icon">M</div>
          <h1>Money Matters</h1>
          <p>Your password reset link is ready. Tap below to launch the application and complete resetting your password.</p>
          
          <a href="#" id="openAppBtn" class="btn">Open Money Matters App</a>
          
          <div class="footer-text">
            If the app doesn't open automatically, please tap the button above to launch it manually.
          </div>
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
            if (error) {
              targetUrl += '?error=' + encodeURIComponent(error);
            } else if (token) {
              targetUrl += '?token=' + encodeURIComponent(token);
            }
          }
          
          // Set manual redirect button target
          document.getElementById('openAppBtn').href = targetUrl;
          
          // Try immediate auto-redirection
          window.location.href = targetUrl;
          
          // Auto-fallback redirect after 1.5 seconds in case of lag
          setTimeout(() => {
            window.location.href = targetUrl;
          }, 1500);
        </script>
      </body>
    </html>
  `);
});

const start = async () => {
  try {
    const port = env.PORT;
    await server.listen({ port, host: '0.0.0.0' });
    server.log.info(`🚀 Server listening on port ${port}`);
  } catch (err) {
    process.exit(1);
  }
};

start();
