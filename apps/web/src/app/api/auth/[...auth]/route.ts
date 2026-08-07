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

    // In dev mode, map un-prefixed neon-auth cookie back to __Secure- for the target Neon auth server
    let reqCookie = req.headers.get("cookie");
    if (process.env.NODE_ENV === "development") {
      console.log(`[DEBUG Auth Proxy] Incoming cookie header: ${reqCookie}`);
      if (reqCookie && reqCookie.includes("neon-auth.session_token=") && !reqCookie.includes("__Secure-neon-auth.session_token=")) {
        reqCookie = reqCookie.replace(/neon-auth\.session_token=/g, "__Secure-neon-auth.session_token=");
        headers.set("cookie", reqCookie);
        console.log(`[DEBUG Auth Proxy] Mapped cookie header for backend: ${reqCookie}`);
      }
    }

    // Align host, origin, and referer headers to match the target auth server domain to bypass CSRF checking
    const targetHost = new URL(authBase).host;
    const targetOrigin = new URL(authBase).origin;
    headers.set("host", targetHost);
    headers.set("origin", targetOrigin);
    headers.set("referer", authBase);

    const options: RequestInit = {
      method: req.method,
      headers,
    };

    if (req.method !== "GET" && req.method !== "HEAD" && req.method !== "OPTIONS") {
      let bodyText = await req.text();
      if (process.env.NODE_ENV === "development" && bodyText) {
        try {
          const bodyJson = JSON.parse(bodyText);
          if (bodyJson.callbackURL) {
            const originalUrl = bodyJson.callbackURL;
            const urlObj = new URL(originalUrl, req.url);
            
            // Extract the original origin of the request
            const reqHost = req.headers.get("x-forwarded-host") || req.headers.get("host") || urlObj.host;
            const reqProto = req.headers.get("x-forwarded-proto") || (req.url.startsWith("https") ? "https" : "http");
            const originalOrigin = `${reqProto}://${reqHost}`;
            
            urlObj.protocol = "http:";
            urlObj.host = "localhost:3000";
            urlObj.searchParams.set("original_origin", originalOrigin);
            
            bodyJson.callbackURL = urlObj.toString();
            bodyText = JSON.stringify(bodyJson);
            console.log(`[DEBUG Auth Proxy] Rewrote callbackURL from ${originalUrl} to ${bodyJson.callbackURL}`);
          }
        } catch (e) {
          // Ignore JSON parse errors
        }
      }
      headers.delete("content-length");
      options.body = bodyText;
    }

    const response = await fetch(targetUrl, options);
    const buffer = await response.arrayBuffer();

    console.log(`[DEBUG Auth Proxy] Target response status: ${response.status}`);
    if (response.status >= 400) {
      const errorText = new TextDecoder().decode(buffer);
      console.log(`[DEBUG Auth Proxy] Target error response: ${errorText}`);
    }

    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey !== "transfer-encoding" && 
        lowerKey !== "content-encoding" && 
        lowerKey !== "content-length" &&
        lowerKey !== "set-cookie"
      ) {
        if (lowerKey === "location" && process.env.NODE_ENV === "development") {
          const incomingHost = req.headers.get("host") || "localhost:3000";
          const proto = req.headers.get("x-forwarded-proto") || (req.url.startsWith("https") ? "https" : "http");
          try {
            const locUrl = new URL(value);
            if (locUrl.host === "localhost:3000") {
              locUrl.protocol = proto;
              locUrl.host = incomingHost;
              value = locUrl.toString();
              console.log(`[DEBUG Auth Proxy] Rewrote redirect Location from localhost:3000 to ${value}`);
            }
          } catch (e) {
            // Relative URL or invalid URL, keep it
          }
        }
        responseHeaders.set(key, value);
      }
    });

    // Extract individual Set-Cookie headers using getSetCookie if available
    const setCookies = typeof (response.headers as any).getSetCookie === "function"
      ? (response.headers as any).getSetCookie()
      : response.headers.get("set-cookie")?.split(",") ?? [];

    for (let cookieVal of setCookies) {
      if (process.env.NODE_ENV === "development") {
        // Strip Secure flag, Partitioned flag and drop __Secure- prefix when running on http://localhost or insecure contexts
        cookieVal = cookieVal
          .replace(/;\s*Secure/gi, "")
          .replace(/;\s*Partitioned/gi, "")
          .replace(/;\s*SameSite=None/gi, "; SameSite=Lax")
          .replace(/__Secure-/gi, "");
      }
      responseHeaders.append("set-cookie", cookieVal.trim());
    }

    if (process.env.NODE_ENV === "development") {
      console.log("[DEBUG Auth Proxy] Final Set-Cookie headers:", responseHeaders.get("set-cookie"));
    }

    return new Response(buffer, {
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
