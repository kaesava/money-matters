import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  return handleProxy(req);
}

export async function POST(req: NextRequest) {
  return handleProxy(req);
}

export async function OPTIONS(req: NextRequest) {
  return handleProxy(req);
}

async function handleProxy(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/api\/auth/, "");
    const authBase = process.env.NEXT_PUBLIC_NEON_AUTH_URL;
    if (!authBase) {
      return new Response(JSON.stringify({ error: "NEXT_PUBLIC_NEON_AUTH_URL is not set" }), { status: 500 });
    }

    const targetUrl = `${authBase}${path}${url.search}`;
    console.log(`[DEBUG Auth Proxy] Forwarding ${req.method} to ${targetUrl}`);

    const headers = new Headers();
    req.headers.forEach((value, key) => {
      // Exclude proxy forwarding headers that confuse the auth server hostname checks
      const lowerKey = key.toLowerCase();
      if (
        !lowerKey.startsWith("x-forwarded-") && 
        lowerKey !== "host" && 
        lowerKey !== "forwarded"
      ) {
        headers.set(key, value);
      }
    });

    // Align host header to the target auth server domain
    const targetHost = new URL(authBase).host;
    headers.set("host", targetHost);

    const options: RequestInit = {
      method: req.method,
      headers,
    };

    if (req.method !== "GET" && req.method !== "HEAD" && req.method !== "OPTIONS") {
      options.body = await req.text();
    }

    const response = await fetch(targetUrl, options);
    const body = await response.text();

    console.log(`[DEBUG Auth Proxy] Target response status: ${response.status}`);
    if (response.status >= 400) {
      console.log(`[DEBUG Auth Proxy] Target error response: ${body}`);
    }

    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() !== "transfer-encoding") {
        responseHeaders.set(key, value);
      }
    });

    return new Response(body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (err) {
    console.error("[Auth Proxy Error]:", err);
    return new Response(JSON.stringify({ error: "Failed to connect to auth service" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}
