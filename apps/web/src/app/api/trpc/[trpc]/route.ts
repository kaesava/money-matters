import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  return handleProxy(req);
}

export async function POST(req: NextRequest) {
  return handleProxy(req);
}

export async function PUT(req: NextRequest) {
  return handleProxy(req);
}

let cachedActiveBase: string | null = null;
let lastProbeTime = 0;

async function resolveApiBase(): Promise<string> {
  const isDev = process.env.NODE_ENV === "development";

  if (!isDev) {
    let envUrl = process.env.NEXT_PUBLIC_API_URL;
    if (envUrl) {
      envUrl = envUrl.replace("api.kaesava.au", "api.moneymatters.kaesava.au");
      return envUrl.trim().replace(/\/+$/, "").replace(/\/trpc$/, "");
    }
    return "https://api.moneymatters.kaesava.au";
  }

  // In local development, probe active Fastify API server on localhost ports
  const now = Date.now();
  if (cachedActiveBase && now - lastProbeTime < 10000) {
    return cachedActiveBase;
  }

  const candidatePorts = [3001, 3002, 3003, 3004];
  for (const port of candidatePorts) {
    try {
      const res = await fetch(`http://localhost:${port}/health`, { signal: AbortSignal.timeout(500) });
      if (res.ok) {
        cachedActiveBase = `http://localhost:${port}`;
        lastProbeTime = now;
        return cachedActiveBase;
      }
    } catch {
      // Continue probing next port
    }
  }

  return "http://localhost:3001";
}

async function handleProxy(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/api\/trpc/, "");
    const apiBase = await resolveApiBase();
    const targetUrl = `${apiBase}/trpc${path}${url.search}`;

    if (process.env.NODE_ENV === "development") {
      console.log(`[DEBUG tRPC Proxy] Forwarding ${req.method} to ${targetUrl} (Cookie present: ${req.headers.has("cookie")})`);
    }

    const headers = new Headers();
    // Copy incoming headers, filtering out forwarding headers that mess up origin matching
    req.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (
        !lowerKey.startsWith("x-forwarded-") && 
        lowerKey !== "host" && 
        lowerKey !== "forwarded"
      ) {
        headers.set(key, value);
      }
    });
    
    // Explicitly set host to align with the target endpoint
    const targetHost = new URL(apiBase).host;
    headers.set("host", targetHost);

    const options: RequestInit = {
      method: req.method,
      headers,
    };

    if (req.method !== "GET" && req.method !== "HEAD") {
      options.body = await req.text();
    }

    const response = await fetch(targetUrl, options);
    const buffer = await response.arrayBuffer();
    
    // Forward the headers, removing compression and transport headers
    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey !== "transfer-encoding" && 
        lowerKey !== "content-encoding" && 
        lowerKey !== "content-length"
      ) {
        if (lowerKey === "set-cookie") {
          responseHeaders.append(key, value);
        } else {
          responseHeaders.set(key, value);
        }
      }
    });

    return new Response(buffer, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (err) {
    console.error("[tRPC Proxy Error]:", err);
    return new Response(JSON.stringify({ error: "Failed to connect to backend service" }), {
      status: 502,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
}
