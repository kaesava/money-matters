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

async function handleProxy(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/api\/trpc/, "");
    // Resolve API target base dynamically from environment variable
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const targetUrl = `${apiBase}/trpc${path}${url.search}`;

    const headers = new Headers();
    // Copy incoming headers
    req.headers.forEach((value, key) => {
      headers.set(key, value);
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
        responseHeaders.set(key, value);
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
