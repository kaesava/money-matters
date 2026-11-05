export function isValidRedirectUrl(target: string): boolean {
  if (!target) return false;
  if (target.startsWith("moneymatters://")) return true;
  try {
    const parsed = new URL(target);
    const host = parsed.hostname;
    if (
      host === "kaesava.au" ||
      host.endsWith(".kaesava.au") ||
      host === "localhost" ||
      host === "127.0.0.1"
    ) {
      return parsed.protocol === "https:" || parsed.protocol === "http:";
    }
    return false;
  } catch {
    return false;
  }
}

export function escapeForScript(val: string): string {
  return JSON.stringify(val || "").replace(/</g, "\\u003c").replace(/>/g, "\\u003e");
}

export function renderPasswordResetHtml(token: string, error: string, redirectTo: string): string {
  const safeToken = escapeForScript(token);
  const safeError = escapeForScript(error);
  const safeRedirectTo = escapeForScript(redirectTo);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Password | Money Matters</title>
  <style>
    body { font-family: sans-serif; background-color: #0b132b; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: rgba(27, 43, 75, 0.4); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 24px; padding: 40px; max-width: 420px; text-align: center; }
    .btn { display: inline-block; width: 100%; padding: 16px; background-color: #2563eb; color: #fff; text-decoration: none; font-weight: 600; border-radius: 14px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Money Matters</h1>
    <p>Your password reset link is ready. Tap below to launch the application.</p>
    <a href="#" id="openAppBtn" class="btn">Open Money Matters App</a>
  </div>
  <script>
    const token = ${safeToken};
    const error = ${safeError};
    const baseRedirect = ${safeRedirectTo};
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
}

export function handleResetPasswordRequest(url: URL, baseHeaders: Record<string, string>): Response {
  const token = url.searchParams.get('token') || '';
  const error = url.searchParams.get('error') || '';
  const requestedRedirect = url.searchParams.get('redirect_to');

  if (requestedRedirect && !isValidRedirectUrl(requestedRedirect)) {
    return new Response(JSON.stringify({ error: 'Invalid or unwhitelisted redirect target domain' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...baseHeaders },
    });
  }

  const redirectTo = requestedRedirect && isValidRedirectUrl(requestedRedirect)
    ? requestedRedirect
    : 'moneymatters://reset-password';

  const html = renderPasswordResetHtml(token, error, redirectTo);
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', ...baseHeaders },
  });
}
