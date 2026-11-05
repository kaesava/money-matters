const PROD_ORIGIN_REGEX = /^https:\/\/([a-z0-9-]+\.)*kaesava\.au$/;
const DEV_ORIGIN_REGEX = /^http:\/\/(localhost|127\.0\.0\.1)(:[0-9]+)?$/;

export function isAllowedOrigin(origin: string | null, isDev = false): boolean {
  if (!origin) return false;
  if (PROD_ORIGIN_REGEX.test(origin)) return true;
  if (isDev && DEV_ORIGIN_REGEX.test(origin)) return true;
  return false;
}

export function buildCorsHeaders(origin: string | null, isDev = false): Record<string, string> {
  const allowed = isAllowedOrigin(origin, isDev);
  const headers: Record<string, string> = {
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, trpc-accept, x-correlation-id, x-tenant-id, x-active-tenant',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };

  if (allowed && origin) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  return headers;
}
