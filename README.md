# Money Matters — Production Monorepo Platform

Money Matters is an active, forward-looking household money management platform for Australian professionals and families. It replaces spreadsheets with a self-healing 5-step waterfall allocation engine, a single pooled Everyday spending balance, bank statement CSV import, and partner collaboration.

---

## 🏗️ Monorepo Topology

```
money-matters/
├── apps/
│   ├── api/           # Fastify API on Cloudflare Workers (`api.moneymatters.kaesava.au`)
│   ├── mobile/        # Expo React Native app (Android target)
│   └── web/           # Next.js App Router on Cloudflare Workers (`moneymatters.kaesava.au`)
├── packages/
│   ├── capabilities/  # Decoupled vertical slice business logic
│   │   ├── billing/         # Subscription state machine, Stripe checkout & portal, webhook processor
│   │   ├── budgeting/       # 5-step waterfall cascade calculation & allocation engine
│   │   ├── file-notes/      # Notes & attachments via Cloudflare R2
│   │   ├── notifications/   # Expo push & 6 scheduled Inngest background jobs
│   │   ├── tenant/          # Household creation, partner invite, bank account CRUD
│   │   └── transactions/    # Ledger, Big 4 AU bank CSV statement parser, velocity check
│   ├── config/        # Validated Zod environment configurations
│   ├── core/          # Server infra (universal logger, rate limiter, auth context)
│   ├── db/            # Drizzle PostgreSQL schemas, migrations, seeds, RLS
│   ├── i18n/          # Centralized localization dictionary & t() helper
│   ├── types/         # Pure domain contracts & Zod DTOs
│   └── ui/            # Serene Finance UI components & design tokens
```

---

## 🚀 Quick Start & Local Development

### Prerequisites
- Node.js (≥20.0.0)
- pnpm (9.0.0)

### Setup Environment
```bash
# Clone the repository
git clone https://github.com/kaesava/money-matters.git
cd money-matters

# Install all workspace dependencies
pnpm install

# Build all packages & apps
pnpm build

# Run typechecks across all 14 monorepo packages
pnpm typecheck

# Run Vitest unit tests
pnpm test
```

### Running Local Development Servers
```bash
# Start Web App (Next.js)
pnpm --filter @money-matters/web dev

# Start API Server (Fastify)
pnpm --filter @money-matters/api dev

# Start Mobile App (Expo Metro bundler)
pnpm --filter @money-matters/mobile dev
```

---

## 🌐 Cloudflare Workers Deployment

Both Web and API apps run on **Cloudflare Workers** using `nodejs_compat`:

```bash
# Deploy Web App to Cloudflare Workers via OpenNext
cd apps/web && pnpm cf-deploy

# Deploy API Server to Cloudflare Workers via Wrangler
cd apps/api && pnpm cf-deploy
```

---

## 🛡️ Production Security & Architecture Guidelines
- **Multi-Tenancy**: All data isolated by `tenantId` with PostgreSQL Row Level Security (RLS).
- **Zero Hardcoded Text**: 100% of user-facing UI labels are localized via `@money-matters/i18n` with full English (`en.ts`) & Japanese (`ja.ts`) translation parity enforced by `check-i18n`.
- **100% Test Coverage**: Comprehensive Vitest unit test suites covering all capabilities, infra modules, and UI components.
- **Zero Hardcoded Styles**: UI components consume centralized Serene Finance design tokens (`#2563eb`, `#1B2B4B`, `#F7F8FA`, `#22c55e`, `#ba1a1a`) from `@money-matters/ui`.
- **Zero PII Logging**: Sensitive fields (emails, passwords, tokens) are automatically redacted in `@money-matters/core` logger.
- **Production Telemetry**: Integrated with PostHog (Self-driving) for product analytics, session replays, and custom funnel events, and Sentry for deep error symbolication. Both are strictly gated to execute only in production builds (`NODE_ENV === "production"` and `!__DEV__`).

---

## 📜 Documentation
- [TECHNICAL_SPEC.md](file:///home/kaesava/projects/money-matters/TECHNICAL_SPEC.md) — Technical architecture, Drizzle ERD, and infrastructure specs.
- [FUNCTIONAL_SPEC.md](file:///home/kaesava/projects/money-matters/FUNCTIONAL_SPEC.md) — Product requirements, onboarding quiz details, and 5-step waterfall logic.
- [AGENTS.md](file:///home/kaesava/projects/money-matters/AGENTS.md) — Architectural rules, MECE principles, and coding standards.
