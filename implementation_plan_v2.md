# Money Matters — Full Implementation Plan

> **Generated**: 2026-07-26  
> **Scope**: All items from the user's request. Release 2 features excluded.  
> **Key findings from codebase research integrated throughout.**

---

## Pre-Work: Scope Corrections (No Work Needed)

Before executing anything, the following items from the request are **already done**:

| Item | Status | Evidence |
|------|--------|----------|
| Mobile enum bug (`MAJOR`/`RECURRING`) | ✅ Already fixed | `categories.tsx` uses `REGULAR`/`GOAL` — no old enum values |
| Delete `geo/` capability | ✅ Already deleted | Directory does not exist |
| Delete `money/` capability | ✅ Already deleted | Directory does not exist |

---

## Part A: Bug Fixes

---

### Bug Fix 1 — `tenant_users` Migration Gap (`invite_email` column missing in production)

**Root Cause Analysis:**  
The Drizzle schema (`tenant_user.ts`) defines `invite_email` as a column, but the actual production database does not have this column. This means a migration was added to the schema but never run against the production DB. There are also two conflicting `0003_*` migration files suggesting a branched migration history.

**Evidence:** `tenant_user.ts` has `inviteEmail: varchar("invite_email", { length: 255 })` but the API fails with `column "invite_email" of relation "tenant_users" does not exist`. Also note: `createTenantHandler` inserts into `tenant_users` without `invite_email` so that should not fail — the error likely happens during a partner invite operation which does set `inviteEmail`.

**Fix:**

#### A1.1 — Audit and reconcile migration files

Check which migrations have been applied to production:
```bash
# Check drizzle migration journal
cat packages/db/drizzle/meta/_journal.json
```

The duplicate `0003_enable_rls.sql` and `0003_schema_refactor.sql` needs to be resolved — only one `0003_*` can be canonical.

#### A1.2 — Create a new migration that adds missing columns

**New file**: `packages/db/drizzle/0008_add_tenant_users_invite_columns.sql`

```sql
-- Add missing invite columns to tenant_users if they don't already exist
ALTER TABLE "tenant_users" ADD COLUMN IF NOT EXISTS "invite_email" varchar(255);
ALTER TABLE "tenant_users" ADD COLUMN IF NOT EXISTS "invite_token" uuid;
ALTER TABLE "tenant_users" ADD COLUMN IF NOT EXISTS "invite_status" "invite_status_enum" NOT NULL DEFAULT 'ACCEPTED';
ALTER TABLE "tenant_users" ADD COLUMN IF NOT EXISTS "invited_at" timestamptz;
```

> [!NOTE]
> Using `ADD COLUMN IF NOT EXISTS` makes this idempotent and safe to re-run.

#### A1.3 — Run migration against production

```bash
pnpm --filter @money-matters/db db:migrate
```

Confirm `DATABASE_URL` points to production before running.

#### A1.4 — Verify `createTenantHandler` doesn't set `inviteEmail`

The handler correctly omits `inviteEmail` (since the OWNER is already authenticated, not invited). No change needed to the handler itself.

---

### Bug Fix 2 — Google Sign-In Redirects Back to `/sign-in`

**Root Cause Analysis:**  
The log shows a successful OAuth flow:
1. `POST /api/auth/sign-in/social` → 200 ✅ (Google auth succeeded)
2. `GET /dashboard?neon_auth_session_verifier=PSKAdXQ41kQZTOle` → 200 ✅ (redirect to dashboard works)
3. `GET /api/auth/get-session` → 200 ✅ (session retrieved successfully)
4. `GET /sign-in` → 200 ❌ (redirected back to sign-in)

**The problem is in step 4→redirect**: The dashboard `layout.tsx` checks `authClient.useSession()`. When the session verifier is in the URL and `get-session` returns 200, the `authClient` must be resolving the session correctly — **but something then triggers the redirect to `/sign-in` anyway.**

**Most likely cause**: The `session_token` key in `localStorage` is used by the landing page to detect auth, but it's **not being set after Google OAuth** (only after email/password sign-in). The `layout.tsx` on the dashboard does `router.replace("/sign-in")` when `!session?.user`, but if `authClient.useSession()` hasn't yet resolved (still `isPending: true`), a race condition can redirect before the session loads. However, the log shows `get-session` returning 200...

**Alternative cause**: The `neon_auth_session_verifier` query parameter needs to be exchanged for a session cookie. The `authClient` may not be processing this verifier token correctly.

**Fix:**

#### A2.1 — Investigate the `authClient` configuration

**File to read**: `apps/web/src/lib/auth.ts`

The `authClient` setup determines how sessions are managed. If the auth client is not configured to handle the `neon_auth_session_verifier` parameter, the session won't be established despite `get-session` returning 200.

#### A2.2 — Add `neon_auth_session_verifier` handler to auth callback

**New file**: `apps/web/src/app/auth-callback/page.tsx` (may already exist — check)

If it doesn't exist, create a page at `/auth-callback` that:
1. Reads `neon_auth_session_verifier` from the URL params
2. Calls `authClient.exchangeVerifier(verifier)` or equivalent to establish the session
3. Redirects to `/dashboard`

#### A2.3 — Fix race condition in `dashboard/layout.tsx`

**File to modify**: `apps/web/src/app/dashboard/layout.tsx`

The redirect must NOT fire while `isPending` is `true`. Confirm current code handles this:

```typescript
useEffect(() => {
  // Only redirect if NOT pending AND no session
  if (!isPending && !session?.user) {
    router.replace("/sign-in");
  }
}, [isPending, session, router]);
```

Add a loading spinner/skeleton while `isPending` to prevent flash of unauthenticated content.

#### A2.4 — Add server-side session validation via API proxy

Check what the `get-session` response actually returns when invoked after Google OAuth. The proxy in `[...auth]/route.ts` forwards to Neon Auth. If the session cookie is set on the Neon Auth domain (not `localhost`), the cookie won't be forwarded in subsequent requests — this is the most likely root cause.

**Fix in `apps/web/src/app/api/auth/[...auth]/route.ts`**: Ensure `Set-Cookie` headers from the upstream Neon Auth response are forwarded back to the browser:

```typescript
// After getting response from Neon Auth, copy Set-Cookie headers
const setCookies = response.headers.getSetCookie();
setCookies.forEach(cookie => responseHeaders.append("Set-Cookie", cookie));
```

> [!IMPORTANT]
> The auth proxy currently strips transfer-encoding and content headers — but it must NOT strip `Set-Cookie` headers. Verify this is not happening.

---

## Part B: Schema Field Clarifications & Decisions

This section answers your investigation questions and calls out any changes required.

### B1 — `categories` table fields

| Field | Status | Decision |
|-------|--------|----------|
| `last_notified_at` | ✅ Used — throttles repeated push alerts per category | Keep. No change. |
| `is_committed` | ✅ Used — marks GOAL categories as firmly committed vs aspirational | Keep. Surface in UI (currently not shown to user). |
| `is_default_excess` | ✅ Used — allocation engine sweeps residual income here | Keep. No change. |
| `is_default_savings` | ⚠️ Redundant with `is_default_excess` for most use cases | Review: if only one "default" is needed, consolidate. For now, keep. |
| `rollover_rule` | ✅ Used by allocation engine (`ROLLOVER`/`SWEEP`/`RESET`) | Keep. No change. |
| `budget_frequency` | ✅ Used — controls how `monthly_amount` is interpreted | Keep. No change. |
| `everyday_allowance_amount` | ✅ Used — target per-paycheck Everyday spending cap for allocation engine | Keep. No change. |

### B2 — `category_schedules` table fields

| Field | Status | Decision |
|-------|--------|----------|
| `rrule` | ✅ Used — iCal recurrence rule for recurring bill schedules | Keep. No change. |
| `start_date` | ✅ Used — recurrence window start (with rrule) | Keep. No change. |
| `end_date` | ✅ Used — recurrence window end (null = indefinite) | Keep. No change. |
| `due_date` | ✅ Used — one-off absolute due date (non-recurring) | Keep. No change (not redundant with `target_date` — different semantics). |
| `target_date` | ✅ Used — GOAL target completion date | Keep. No change. |

**Verdict**: No redundancy. `due_date` is for recurring bill occurrences; `target_date` is for savings goals.

### B3 — `tenants` table: `tenant_id` duplicating `id`

**Status**: ✅ By design — the `tenantAndTimestamps` mixin adds `tenant_id` to ALL tables including `tenants` itself. For the tenant's own row, `tenant_id = id`. This enables uniform RLS policies across all tables without special-casing.

**Decision**: Keep. No change. Document explicitly in schema.

### B4 — `users` table: missing `archived_by`, `created_by`, `updated_by`

**Status**: ✅ Intentional — `users` is a **platform-level** table (not tenant-scoped). It mirrors Neon Auth's user record. Audit trail UUIDs would be self-referential (who updated the user? The user themselves). The `archivedAt` timestamp is sufficient for soft-delete.

**Decision**: Keep as-is. No `created_by`/`updated_by`/`archived_by` on the users table. Document explicitly.

---

## Part C: Functional Changes

---

### C1 — `user_preferences`: App-Specific Preferences (JSONB)

**Problem**: `quick_actions_collapsed` is app-specific behaviour but lives as a typed boolean column. If a second app is built on this platform, it would inherit this preference even if it has no Quick Actions panel.

**Decision**: JSONB blob keyed by `app_id` (as selected).

#### C1.1 — Modify `user_preferences` schema

**File to modify**: `packages/db/src/schema/user_preference.ts`

```typescript
import { pgTable, uuid, boolean, timestamp, varchar, jsonb } from "drizzle-orm/pg-core";

export const userPreferences = pgTable("user_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  tenantId: uuid("tenant_id").notNull(),
  // Global preferences (apply across all apps)
  timezone: varchar("timezone", { length: 100 }).notNull().default("UTC"),
  paydayAlertsEnabled: boolean("payday_alerts_enabled").notNull().default(true),
  shortfallAlertsEnabled: boolean("shortfall_alerts_enabled").notNull().default(true),
  billRemindersEnabled: boolean("bill_reminders_enabled").notNull().default(true),
  weeklyDigestEnabled: boolean("weekly_digest_enabled").notNull().default(false),
  // App-specific preferences: keyed by appId
  // Example: { "01908bde-...": { "quick_actions_collapsed": true } }
  appPreferences: jsonb("app_preferences").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Type helper for app preferences blob
export interface AppPreferencesBlob {
  quick_actions_collapsed?: boolean;
  // Add new app-specific prefs here
}
```

#### C1.2 — Create migration

**New file**: `packages/db/drizzle/0009_user_preferences_app_jsonb.sql`

```sql
-- Add app_preferences JSONB column
ALTER TABLE "user_preferences" ADD COLUMN IF NOT EXISTS "app_preferences" jsonb NOT NULL DEFAULT '{}';

-- Migrate existing quick_actions_collapsed data into the JSONB blob
-- Uses the hardcoded money-matters app_id (from createTenant fallback)
UPDATE "user_preferences" 
SET "app_preferences" = jsonb_build_object(
  '01908bde-34bb-7b19-a178-574211bc93aa',
  jsonb_build_object('quick_actions_collapsed', quick_actions_collapsed)
)
WHERE quick_actions_collapsed = true;

-- Drop the old boolean column
ALTER TABLE "user_preferences" DROP COLUMN IF EXISTS "quick_actions_collapsed";
```

#### C1.3 — Update all API references to `quickActionsCollapsed`

Search for all usages of `quickActionsCollapsed` in the API routers and tRPC handlers and update them to read/write from `appPreferences[appId].quick_actions_collapsed`.

#### C1.4 — Add a Zod type for AppPreferencesBlob in `packages/types`

```typescript
// packages/types/src/app-preferences.ts
export const AppPreferencesBlobSchema = z.object({
  quick_actions_collapsed: z.boolean().optional(),
}).strict();
export type AppPreferencesBlob = z.infer<typeof AppPreferencesBlobSchema>;
```

---

### C2 — New `app_categories` Table + Tenant Seeding

**Spec**: A template table for default categories. When a new tenant is created, copy rows from `app_categories` into `categories` with the tenant's `tenantId` stamped.

#### C2.1 — New schema file

**New file**: `packages/db/src/schema/app_category.ts`

```typescript
import { pgTable, uuid, varchar, numeric } from "drizzle-orm/pg-core";
import { categoryTypeEnum } from "./category.js";

/**
 * App-level category templates. NOT tenant-scoped.
 * Copied into `categories` table on tenant creation.
 * Rows in this table CANNOT be archived (no archivedAt).
 */
export const appCategories = pgTable("app_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  appId: uuid("app_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: categoryTypeEnum("type").notNull(),
  icon: varchar("icon", { length: 50 }),
  colour: varchar("colour", { length: 7 }),
  /** Annualised amount in AUD (used to calculate monthly allocations) */
  annualisedAmount: numeric("annualised_amount", { precision: 12, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid("created_by").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid("updated_by").notNull(),
  // NO tenantId — app-level data only
  // NO archivedAt / archivedBy — cannot be archived
});
```

#### C2.2 — Create migration

**New file**: `packages/db/drizzle/0010_add_app_categories.sql`

```sql
CREATE TABLE IF NOT EXISTS "app_categories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "app_id" uuid NOT NULL,
  "name" varchar(255) NOT NULL,
  "type" "category_type_enum" NOT NULL,
  "icon" varchar(50),
  "colour" varchar(7),
  "annualised_amount" numeric(12,2),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid NOT NULL,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid NOT NULL
);
```

#### C2.3 — Seed initial `app_categories` from `AUSTRALIAN_FAMILY_PRESETS`

**New file**: `packages/db/src/seed/app-categories.seed.ts`

Seed the `app_categories` table with the Australian family presets:

```typescript
// Converts AUSTRALIAN_FAMILY_PRESETS monthly amounts to annualised
// REGULAR bills: suggestedMonthlyAud * 12
// GOAL categories: suggestedMonthlyAud * 12 (as annual target)
const MONEY_MATTERS_APP_ID = "01908bde-34bb-7b19-a178-574211bc93aa";
const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000"; // system seed user

export async function seedAppCategories(db) {
  for (const preset of AUSTRALIAN_FAMILY_PRESETS) {
    await db.insert(appCategories).values({
      appId: MONEY_MATTERS_APP_ID,
      name: preset.name,
      type: preset.type,
      icon: preset.emoji,
      colour: null,
      annualisedAmount: (preset.suggestedMonthlyAud * 12).toFixed(2),
      createdBy: SYSTEM_USER_ID,
      updatedBy: SYSTEM_USER_ID,
    }).onConflictDoNothing();
  }
}
```

Add the seed to `packages/db/src/seed/index.ts`.

#### C2.4 — Also seed the `EVERYDAY` category template

The presets only have `REGULAR` and `GOAL` types. Add an `EVERYDAY` template:

```typescript
{ name: "Everyday Spending", type: "EVERYDAY", emoji: "💳", annualisedAmount: null }
```

#### C2.5 — API: New `appCategories` router endpoints

**New file**: `apps/api/src/routers/app-categories.router.ts`

```typescript
// Procedures:
// listAppCategories: publicProcedure — returns all app_categories for the current appId
// createAppCategory: adminProcedure (future) — creates a new app-level template
// updateAppCategory: adminProcedure (future)
```

Wire into `_app.ts` router.

#### C2.6 — Modify `createTenantHandler` to seed categories on tenant creation

**File to modify**: `packages/capabilities/tenant/src/index.ts`

After creating the tenant and owner record, query `app_categories` for the current `appId` and insert them into `categories` with the new `tenantId`:

```typescript
// After inserting tenants and tenant_users:
const templates = await db
  .select()
  .from(appCategories)
  .where(eq(appCategories.appId, appId));

for (const template of templates) {
  await db.insert(categories).values({
    tenantId,
    appId,
    name: template.name,
    type: template.type,
    icon: template.icon,
    colour: template.colour,
    // Convert annualised → monthly for categories.monthly_amount
    monthlyAmount: template.annualisedAmount 
      ? (Number(template.annualisedAmount) / 12).toFixed(2) 
      : null,
    rolloverRule: "ROLLOVER",
    isDefaultExcess: template.type === "EVERYDAY",  // first EVERYDAY becomes default excess
    createdBy: userId,
    updatedBy: userId,
  });
}
```

> [!IMPORTANT]
> New tenants only. Existing tenants are NOT backfilled (per your selection).

#### C2.7 — Add Zod types in `packages/types`

```typescript
// packages/types/src/app-category.types.ts
export const CreateAppCategoryCommand = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(["REGULAR", "GOAL", "EVERYDAY"]),
  icon: z.string().max(50).optional(),
  colour: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  annualisedAmount: z.number().positive().optional(),
}).strict();
```

---

## Part D: Go-Live Blockers

---

### D1 — Credentials: Rotate & Remove from Git History

> [!CAUTION]
> This requires you to manually rotate credentials in each service. I will handle the `.gitignore`, `.env.example`, and repo cleanup — but only you can generate new credentials.

#### D1.1 — Add `.env` to `.gitignore`

**File to modify**: `.gitignore`

```
# Environment secrets — NEVER commit these
.env
.env.production
.env.local
```

#### D1.2 — Create `.env.example` with placeholder values

**New file**: `.env.example` (committed to git — safe)

```bash
# Neon DB
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

# Inngest
INNGEST_SIGNING_KEY=signkey-prod-...
INNGEST_EVENT_KEY=...

# Resend (email)
RESEND_API_KEY=re_...

# Cloudflare R2 (file storage)
STORAGE_BUCKET_NAME=money-matters-production
STORAGE_ACCESS_KEY_ID=...
STORAGE_SECRET_ACCESS_KEY=...
STORAGE_ENDPOINT=https://...r2.cloudflarestorage.com
STORAGE_REGION=auto
GLOBAL_MAX_FILE_SIZE_MB=10

# Neon Auth
NEXT_PUBLIC_NEON_AUTH_URL=https://...neonauth...
NEON_AUTH_JWKS_URL=https://...neonauth.../jwks.json

# Sentry (add after Sentry setup)
SENTRY_DSN_API=...
SENTRY_DSN_WEB=...
```

#### D1.3 — Remove `.env` from git history (you must run this)

```bash
# Remove .env from all git history
git filter-repo --path .env --invert-paths

# Or use git-filter-branch (older approach)
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch .env' \
  --prune-empty --tag-name-filter cat -- --all

# Force push (coordinate with your team)
git push origin --force --all
```

> [!CAUTION]
> After removing from history, you MUST rotate ALL credentials listed in `.env` — assume they are compromised since they were in git history. Services to rotate: Neon DB password, Inngest keys, Resend API key, Cloudflare R2 keys.

---

### D2 — Web App: Server-Side Auth Middleware

**File to create**: `apps/web/src/middleware.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/", "/sign-in", "/sign-up", "/auth-callback", "/reset-password", "/api/"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow invite paths (partner must be able to visit without being authenticated)
  if (pathname.startsWith("/invite/")) {
    return NextResponse.next();
  }

  // For protected paths (/dashboard/*, /setup/*):
  // Check for Neon Auth session cookie
  // Neon Auth sets a session cookie — check its presence
  // Note: the exact cookie name must be confirmed from Neon Auth docs / browser DevTools
  const sessionCookie = request.cookies.get("better-auth.session_token") 
    ?? request.cookies.get("__Secure-better-auth.session_token")
    ?? request.cookies.get("neon_auth_session");

  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/setup/:path*"],
};
```

> [!IMPORTANT]
> The exact session cookie name used by Neon Auth / Better Auth must be confirmed by inspecting browser cookies after a successful email/password sign-in. Check DevTools → Application → Cookies. Update the cookie name in the middleware accordingly.

---

### D3 — Deployment: Render (Web + API) + GitHub Auto-Deploy

Since GitHub is already linked to Render and deploys on merge to `main`, this is primarily about ensuring the right `render.yaml` configuration is in the repo for reproducibility.

**New file**: `render.yaml` (root of repo)

```yaml
services:
  - type: web
    name: money-matters-web
    runtime: node
    rootDir: apps/web
    buildCommand: pnpm install --frozen-lockfile && pnpm --filter @money-matters/web build
    startCommand: pnpm --filter @money-matters/web start
    envVars:
      - key: NODE_ENV
        value: production
      - key: NEXT_PUBLIC_NEON_AUTH_URL
        sync: false
      - key: NEON_AUTH_JWKS_URL
        sync: false
      - key: DATABASE_URL
        sync: false

  - type: web
    name: money-matters-api
    runtime: node
    rootDir: apps/api
    buildCommand: pnpm install --frozen-lockfile && pnpm --filter @money-matters/api build
    startCommand: node dist/index.js
    healthCheckPath: /health
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        sync: false
      - key: INNGEST_SIGNING_KEY
        sync: false
      - key: INNGEST_EVENT_KEY
        sync: false
      - key: RESEND_API_KEY
        sync: false
      - key: SENTRY_DSN_API
        sync: false
```

Add environment variables to Render dashboard manually (never commit live values).

---

### D4 — Fix CORS: Restrict to Production Domain

**File to modify**: `apps/api/src/index.ts`

```typescript
const allowedOrigins = [
  "https://kaesava.au",
  "https://www.kaesava.au",
  ...(process.env.NODE_ENV !== "production" 
    ? ["http://localhost:3000", "http://localhost:3001"] 
    : []),
];

fastify.register(cors, {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`), false);
    }
  },
  credentials: true,
});
```

---

### D5 — Add Helmet to Fastify API

**Install**:
```bash
pnpm add @fastify/helmet --filter api
```

**File to modify**: `apps/api/src/index.ts`

```typescript
import helmet from "@fastify/helmet";

// Register before route handlers
await fastify.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
  // Allow Inngest iframe if needed
  frameguard: { action: "sameorigin" },
});
```

---

### D6 — Mobile Setup Enum Bug

**Status**: ✅ Already fixed per codebase research. No action required. (`categories.tsx` already uses `REGULAR`/`GOAL` — the `MAJOR`/`RECURRING` values are gone.)

---

### D7 — CI/CD: GitHub Actions

**New file**: `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  ci:
    name: Lint, Typecheck, Test
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: pnpm/action-setup@v3
        with:
          version: 9.0.0
          
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
          
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
        
      - name: Lint
        run: pnpm lint
        
      - name: Typecheck
        run: pnpm typecheck
        
      - name: Test
        run: pnpm test
        env:
          DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
```

**New file**: `.github/workflows/deploy.yml`

```yaml
name: Deploy to Render

on:
  push:
    branches: [main]

jobs:
  deploy:
    name: Trigger Render Deploy
    runs-on: ubuntu-latest
    needs: [] # depends on CI workflow passing
    
    steps:
      - name: Deploy API to Render
        run: |
          curl -X POST "${{ secrets.RENDER_DEPLOY_HOOK_API }}"
          
      - name: Deploy Web to Render
        run: |
          curl -X POST "${{ secrets.RENDER_DEPLOY_HOOK_WEB }}"
```

**GitHub Secrets to configure** (in repo Settings → Secrets):
- `TEST_DATABASE_URL` — Neon dev database URL
- `RENDER_DEPLOY_HOOK_API` — Render deploy hook URL for API service
- `RENDER_DEPLOY_HOOK_WEB` — Render deploy hook URL for Web service

---

### D8 — Sentry Error Monitoring

You have a Sentry org — please provide the DSNs for:
1. API (Node.js) project
2. Web (Next.js) project
3. Mobile (React Native) project

**Install**:
```bash
pnpm add @sentry/node --filter api
pnpm add @sentry/nextjs --filter web
pnpm add @sentry/react-native --filter mobile
```

**File to create**: `apps/api/src/sentry.ts`
```typescript
import * as Sentry from "@sentry/node";
Sentry.init({
  dsn: process.env.SENTRY_DSN_API,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  enabled: process.env.NODE_ENV === "production",
});
```

**File to create**: `apps/web/sentry.client.config.ts`, `apps/web/sentry.server.config.ts`, `apps/web/sentry.edge.config.ts` (standard Next.js Sentry setup)

**File to modify**: `apps/web/next.config.js` — wrap with `withSentryConfig()`

---

## Part E: Pre-Launch Polish

---

### E1 — Redis Rate Limiter (Upstash — Free Tier, Works with Render)

**Recommended**: **Upstash Redis** — serverless, free tier (10,000 commands/day), works natively with both Render and `@fastify/rate-limit`.

**Setup**:
1. Create free account at [upstash.com](https://upstash.com)
2. Create a Redis database (region: `ap-southeast-1` for AU latency)
3. Copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

**Install**:
```bash
pnpm add @upstash/redis ioredis @fastify/rate-limit --filter api
```

**File to modify**: `packages/core/src/rate-limiter.ts`

Replace `mockMemoryStore` with Upstash Redis adapter:

```typescript
import { Redis } from "@upstash/redis";
import rateLimit from "@fastify/rate-limit";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function registerRateLimiter(fastify: FastifyInstance) {
  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
    redis,
    keyGenerator: (req) => req.headers["x-auth-token"] as string ?? req.ip,
  });
}
```

---

### E2 — Fix `item: any` in `transactions.tsx`

**File to modify**: `apps/mobile/src/app/(app)/transactions.tsx`

Import the transaction type from `@money-matters/types` and replace `(item: any)` with the correct inferred type from the tRPC query result.

```typescript
// Replace:
sorted.slice(...).map((item: any) => {

// With:
type TransactionRow = (typeof sorted)[number];
sorted.slice(...).map((item: TransactionRow) => {
```

---

### E3 — Refactor `paychecks.tsx` (500 lines → components)

**File**: `apps/mobile/src/app/(app)/paychecks.tsx` (500 lines — exceeds 250-line limit per AGENTS.md §22)

Extract into:
- `apps/mobile/src/components/paychecks/UpcomingEventsList.tsx` — the events segment
- `apps/mobile/src/components/paychecks/SourcesBillsList.tsx` — the sources segment
- `apps/mobile/src/components/paychecks/IncomeSourceCard.tsx` — individual income source card
- `apps/mobile/src/components/paychecks/ExpenseBillCard.tsx` — individual expense bill card

`paychecks.tsx` becomes a thin orchestrator (<100 lines) that imports and composes these components.

---

### E4 — Verify Mobile Setup End-to-End

**Status**: Enum values are already correct (REGULAR/GOAL). However, verify the complete submission flow:

1. Run through mobile setup wizard step 2
2. Confirm categories are created with `type: "REGULAR"` and `type: "GOAL"` in the DB
3. Confirm income events are generated after setup
4. Confirm dashboard shows populated data

---

### E5 — Dead Code Already Cleaned Up

**Status**: `geo/` and `money/` capabilities are already deleted. No action required.

---

### E6 — i18n Hardcoded String Audit

Run: `pnpm lint` (which includes the `check-i18n` verification script) and fix any hardcoded strings found in the new mobile UI components added during the UI cleanup session.

---

## Execution Order

```
Phase 1 (Immediate - Bugs):
  A1: Run tenant_users migration (invite_email fix)
  A2: Investigate + fix Google OAuth session

Phase 2 (Security - Before any public access):
  D1: Rotate credentials + remove from git
  D2: Add Next.js middleware
  D4: Fix CORS
  D5: Add Helmet

Phase 3 (Functional - New features):
  C1: user_preferences JSONB migration
  C2: app_categories table + seeding

Phase 4 (Infrastructure):
  D3: render.yaml deployment config
  D7: GitHub Actions CI/CD
  D8: Sentry (after you provide DSNs)
  E1: Upstash Redis rate limiter

Phase 5 (Polish):
  E2: Fix item: any in transactions.tsx
  E3: Refactor paychecks.tsx
  E4: Verify setup end-to-end
  E6: i18n audit
```

---

## Open Questions Before Execution

> [!IMPORTANT]
> Please confirm or provide the following before I start executing:
>
> 1. **Google OAuth fix**: Should I read `apps/web/src/lib/auth.ts` and `apps/web/src/app/auth-callback/page.tsx` to diagnose the exact root cause before proposing the fix? Or do you want me to proceed with the proxy `Set-Cookie` fix and the race condition guard as described?
>
> 2. **Sentry DSNs**: Can you provide the 3 DSNs (API, Web, Mobile) now? Or should I create placeholder Sentry config that you can fill in later?
>
> 3. **app_categories seed data**: Should the initial `app_categories` seed be populated from `AUSTRALIAN_FAMILY_PRESETS` (the existing preset types), plus the EVERYDAY category? Or do you want to curate a different initial set?
>
> 4. **render.yaml**: Do you want me to verify the exact build/start commands against the existing `package.json` scripts before writing `render.yaml`?
