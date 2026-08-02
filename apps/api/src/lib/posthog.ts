import { PostHog } from 'posthog-node';

const isProduction = process.env.NODE_ENV === 'production';
const apiKey = process.env.POSTHOG_API_KEY;
const host = process.env.POSTHOG_HOST;

// Only instantiate PostHog in production. Dev/staging traffic must never
// reach production analytics, and the wizard-generated error logs would
// spam local console output every restart.
if (!isProduction && !apiKey) {
  // Silent in development — absence of the key is expected.
}

if (isProduction && !apiKey) {
  console.warn(
    '[PostHog] POSTHOG_API_KEY is missing in production — events will not be captured.'
  );
}

export const posthog: PostHog | null =
  isProduction && apiKey
    ? new PostHog(apiKey, {
        host: host || 'https://us.i.posthog.com',
        flushAt: 20,
        flushInterval: 10000,
        enableExceptionAutocapture: true,
      })
    : null;
