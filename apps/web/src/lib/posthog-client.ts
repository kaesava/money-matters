import posthog from "posthog-js";

const isProduction = process.env.NODE_ENV === "production";
const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

// Only init PostHog in production. Dev traffic must never pollute analytics.
if (isProduction) {
  if (!projectToken) {
    console.warn(
      "NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN is missing — PostHog will not initialise in production."
    );
  } else {
    posthog.init(projectToken, {
      api_host: host || "https://us.i.posthog.com",
      defaults: "2026-01-30",
      capture_exceptions: true,
    });
  }
}

export default posthog;
