import posthog from "posthog-js";

const isProduction = process.env.NODE_ENV === "production";
const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;

// Only init PostHog in production. Dev traffic must never pollute analytics.
if (isProduction) {
  if (!projectToken) {
    console.warn(
      "NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN is missing — PostHog will not initialise in production."
    );
  } else {
    posthog.init(projectToken, {
      // Always send through the same-origin /ingest reverse proxy so ad
      // blockers cannot drop events. This value is fixed and cannot be
      // overridden by an environment variable.
      api_host: "/ingest",
      ui_host: "https://us.posthog.com",
      defaults: "2026-01-30",
      capture_exceptions: true,
    });
  }
}

export default posthog;
