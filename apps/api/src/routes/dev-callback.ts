export function handleDevCallbackRequest(
  url: URL,
  isDev: boolean,
  baseHeaders: Record<string, string>
): Response {
  if (!isDev) {
    return new Response(JSON.stringify({ error: 'Endpoint disabled in production.' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...baseHeaders },
    });
  }

  const rawPath = url.pathname.replace(/^\/dev-callback\/?/, '');

  if (rawPath.startsWith('moneymatters/') || rawPath.startsWith('exp/')) {
    const scheme = rawPath.startsWith('exp/') ? 'exp://' : 'moneymatters://';
    const subPath = rawPath.replace(/^(moneymatters|exp)\//, '');
    const requestedRedirect = url.searchParams.get('redirect_to');
    const targetBase = requestedRedirect || `${scheme}${subPath}`;
    const targetUrl = new URL(targetBase);

    url.searchParams.forEach((val, key) => {
      if (key !== 'redirect_to') {
        targetUrl.searchParams.set(key, val);
      }
    });

    return Response.redirect(targetUrl.toString(), 302);
  }

  const segments = rawPath.split('/');
  if (segments.length >= 2) {
    const proto = decodeURIComponent(segments[0]);
    const hostAndPath = decodeURIComponent(segments.slice(1).join('/'));
    const hostOnly = hostAndPath.split('/')[0].split(':')[0];
    const isAllowedHost =
      hostOnly === 'localhost' || hostOnly === '127.0.0.1' || hostOnly.endsWith('.kaesava.au');
    if (!isAllowedHost) {
      return new Response(JSON.stringify({ error: 'Forbidden host.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...baseHeaders },
      });
    }

    const customTarget = url.searchParams.get('target') || '/auth-callback';
    try {
      const targetUrl = new URL(customTarget, `${proto}://${hostAndPath}`);
      url.searchParams.forEach((val, key) => {
        if (key !== 'target') {
          targetUrl.searchParams.set(key, val);
        }
      });
      return Response.redirect(targetUrl.toString(), 302);
    } catch {
      // Fallback
    }
  }

  return Response.redirect('https://moneymatters.kaesava.au/dashboard', 302);
}
