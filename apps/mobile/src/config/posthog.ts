import PostHog from 'posthog-react-native';
import Constants from 'expo-constants';

// Configuration loaded from app.config.js extras via expo-constants OR EXPO_PUBLIC_* env vars.
const projectToken =
  (Constants.expoConfig?.extra?.posthogProjectToken as string | undefined) ||
  process.env.EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN ||
  process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;

const host =
  (Constants.expoConfig?.extra?.posthogHost as string | undefined) ||
  process.env.EXPO_PUBLIC_POSTHOG_HOST ||
  process.env.POSTHOG_HOST ||
  'https://us.i.posthog.com';

const isPostHogConfigured = Boolean(projectToken);

if (__DEV__ && !isPostHogConfigured) {
  console.error(
    'POSTHOG_PROJECT_TOKEN variable required by PostHog is missing or un-configured, ' +
      'this causes events to be silently missed. ' +
      'This error stops appearing once POSTHOG_PROJECT_TOKEN is configured'
  );
}

/**
 * PostHog client instance for Money Matters mobile app.
 *
 * Configuration loaded from app.config.js extras via expo-constants.
 * Required peer dependencies: react-native-svg (surveys feature).
 *
 * @see https://posthog.com/docs/libraries/react-native
 */
export const posthog = new PostHog(projectToken || 'placeholder_disabled', {
  host,

  // Disable PostHog entirely when no project token is configured OR in dev builds.
  // We never want dev traffic polluting production analytics.
  disabled: !isPostHogConfigured || __DEV__,

  // Capture app lifecycle events (install, update, open, background)
  captureAppLifecycleEvents: true,

  // Batching: optimise battery life by sending events in batches
  flushAt: 20,
  flushInterval: 10000,
  maxBatchSize: 100,
  maxQueueSize: 1000,

  // Feature flags
  preloadFeatureFlags: true,
  sendFeatureFlagEvent: true,
  featureFlagsRequestTimeoutMs: 10000,

  // Network
  requestTimeout: 10000,
  fetchRetryCount: 3,
  fetchRetryDelay: 3000,
});

export const isPostHogEnabled = isPostHogConfigured;
