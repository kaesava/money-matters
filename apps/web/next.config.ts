import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@money-matters/ui",
    "@money-matters/i18n",
    "@money-matters/types",
    "@money-matters/db",
    "@money-matters/core",
    "@money-matters/config",
    "@money-matters/capability-budgeting",
    "@money-matters/capability-transactions",
    "@money-matters/capability-tenant",
    "@money-matters/capability-notifications",
  ],
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@trpc/react-query",
      "better-auth",
      "@money-matters/ui",
      "@money-matters/i18n",
    ],
  },
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js", ".jsx"],
      ".mjs": [".mts", ".mjs"],
      ".cjs": [".cts", ".cjs"],
    };
    return config;
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              process.env.NODE_ENV === "development"
                ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://us.i.posthog.com https://us-assets.i.posthog.com"
                : "script-src 'self' 'unsafe-inline' https://us.i.posthog.com https://us-assets.i.posthog.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              "img-src 'self' data: blob: https://*.posthog.com https://us.i.posthog.com",
              process.env.NODE_ENV === "development"
                ? "connect-src 'self' https://api.moneymatters.kaesava.au https://us.i.posthog.com https://*.ingest.us.sentry.io https://*.neonauth.ap-southeast-2.aws.neon.tech http://localhost:* ws://localhost:*"
                : "connect-src 'self' https://api.moneymatters.kaesava.au https://us.i.posthog.com https://*.ingest.us.sentry.io https://*.neonauth.ap-southeast-2.aws.neon.tech",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/dashboard/setup",
        destination: "/setup",
        permanent: false,
      },
      {
        source: "/dashboard/paychecks",
        destination: "/dashboard/income-and-bills",
        permanent: false,
      },
      {
        source: "/dashboard/transactions",
        destination: "/dashboard/history",
        permanent: false,
      },
      {
        source: "/dashboard/pools",
        destination: "/dashboard/envelopes",
        permanent: false,
      },
      {
        source: "/dashboard/goals",
        destination: "/dashboard/envelopes",
        permanent: false,
      },
      {
        source: "/dashboard/accounts",
        destination: "/dashboard/bank-accounts",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
