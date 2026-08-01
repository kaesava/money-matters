# Implementation Plan — Money Matters Commercialisation
> **Decisions locked via /grill-me** | **Status:** Awaiting approval

---

## Background

This implements the full freemium commercialisation model across the Money Matters monorepo. No Stripe code exists anywhere in the codebase. The `tenants.premium_enabled` boolean and `FEATURE_FLAGS.premiumEnabled` are the only existing hooks.

**Model in one sentence:** Sign up → 30 days full Household access (no card) → trial expires → 7-day read-only grace → drops to permanent Free tier → upgrade anytime.

---

## User Review Required

> [!IMPORTANT]
> **ABN prerequisite:** You must register an ABN as a sole trader at [business.gov.au](https://www.business.gov.au) and create a Stripe account before Phase 2 begins. Phase 2 requires a live Stripe account to generate price IDs and webhook secrets.

> [!WARNING]
> **tenantProcedure performance:** Adding a `getSubscriptionStatus` DB query to every tRPC call adds ~1–2ms per request on Neon serverless. This is acceptable at launch scale. If it becomes a bottleneck, the status can be cached in Upstash Redis (tenant-scoped key, 5-minute TTL). This optimisation is noted but out of scope for this plan.

> [!IMPORTANT]
> **Partner invite UI removal:** The `invitePartner` and `acceptInvite` backend handlers are preserved. Only the UI invite button/section is removed. The `/invite/[token]` route remains public (existing links still work). This is reversible.

---

## Proposed Changes

---

### Component 1 — `packages/db`

#### [NEW] Migration `0011_add_subscription_columns.sql`

New file in `packages/db/drizzle/`. Adds subscription lifecycle columns to the `tenants` table. Migration is deterministic and rollback-safe (all new nullable or default-bearing columns).

```sql
ALTER TABLE tenants
  ADD COLUMN subscription_status VARCHAR(30) NOT NULL DEFAULT 'TRIAL_ACTIVE',
  ADD COLUMN trial_started_at TIMESTAMPTZ,
  ADD COLUMN trial_ends_at TIMESTAMPTZ,
  ADD COLUMN trial_grace_ends_at TIMESTAMPTZ,
  ADD COLUMN stripe_customer_id VARCHAR(255),
  ADD COLUMN stripe_subscription_id VARCHAR(255),
  ADD COLUMN stripe_price_id VARCHAR(255),
  ADD COLUMN subscribed_at TIMESTAMPTZ,
  ADD COLUMN subscription_ends_at TIMESTAMPTZ;

CREATE INDEX idx_tenants_subscription_status ON tenants (subscription_status);
CREATE INDEX idx_tenants_trial_grace_ends_at ON tenants (trial_grace_ends_at)
  WHERE subscription_status IN ('TRIAL_ACTIVE', 'TRIAL_GRACE');
```

#### [MODIFY] [tenant.ts](file:///home/kaesava/projects/money-matters/packages/db/src/schema/tenant.ts)

Add all subscription columns to the Drizzle schema:

```typescript
import { pgTable, uuid, varchar, boolean, timestamp } from "drizzle-orm/pg-core";
import { tenantAndTimestamps } from "./base.js";

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  fyEndMonthDay: varchar("fy_end_month_day", { length: 5 }).notNull().default("06-30"),
  premiumEnabled: boolean("premium_enabled").notNull().default(false),
  // --- Subscription lifecycle ---
  subscriptionStatus: varchar("subscription_status", { length: 30 })
    .notNull()
    .default("TRIAL_ACTIVE"),
  trialStartedAt: timestamp("trial_started_at", { withTimezone: true }),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  trialGraceEndsAt: timestamp("trial_grace_ends_at", { withTimezone: true }),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  stripePriceId: varchar("stripe_price_id", { length: 255 }),
  subscribedAt: timestamp("subscribed_at", { withTimezone: true }),
  subscriptionEndsAt: timestamp("subscription_ends_at", { withTimezone: true }),
  ...tenantAndTimestamps,
});
```

---

### Component 2 — `packages/types`

#### [MODIFY] [index.ts](file:///home/kaesava/projects/money-matters/packages/types/src/index.ts)

**Add** `SubscriptionStatus` enum and update `TenantSchema`:

```typescript
// New: subscription status state machine
export const SubscriptionStatus = z.enum([
  "TRIAL_ACTIVE",
  "TRIAL_GRACE",
  "FREE_TIER",
  "SUBSCRIBED",
  "PAST_DUE",
  "DEACTIVATED",
]);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatus>;

// Updated TenantSchema — add after existing premiumEnabled field:
export const TenantSchema = BaseSchema.extend({
  name: z.string().min(1),
  fyEndMonthDay: z.string().regex(/^\d{2}-\d{2}$/).default("06-30"),
  premiumEnabled: z.boolean().default(false),
  subscriptionStatus: SubscriptionStatus.default("TRIAL_ACTIVE"),
  trialStartedAt: z.date().nullable(),
  trialEndsAt: z.date().nullable(),
  trialGraceEndsAt: z.date().nullable(),
  stripeCustomerId: z.string().nullable(),
  stripeSubscriptionId: z.string().nullable(),
  stripePriceId: z.string().nullable(),
  subscribedAt: z.date().nullable(),
  subscriptionEndsAt: z.date().nullable(),
}).strict();

// New: DTO for billing status queries
export const SubscriptionStatusDto = z.object({
  status: SubscriptionStatus,
  trialEndsAt: z.date().nullable(),
  trialGraceEndsAt: z.date().nullable(),
  subscriptionEndsAt: z.date().nullable(),
  isTrialActive: z.boolean(),
  isTrialGrace: z.boolean(),
  isFreeTier: z.boolean(),
  isSubscribed: z.boolean(),
  isPastDue: z.boolean(),
  isDeactivated: z.boolean(),
  daysRemainingInTrial: z.number().nullable(),
}).strict();
export type SubscriptionStatusDto = z.infer<typeof SubscriptionStatusDto>;
```

#### [MODIFY] [commands.types.ts](file:///home/kaesava/projects/money-matters/packages/types/src/commands.types.ts)

**Add** billing command schemas:

```typescript
export const CreateCheckoutSessionCommand = z.object({
  priceId: z.string().min(1),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
}).strict();

export const CreateCustomerPortalCommand = z.object({
  returnUrl: z.string().url(),
}).strict();
```

---

### Component 3 — `packages/config`

#### [MODIFY] [env.ts](file:///home/kaesava/projects/money-matters/packages/config/src/env.ts)

**Add** Stripe environment variables to `envSchema`:

```typescript
// --- Stripe (payments) ---
STRIPE_SECRET_KEY: z.string().optional(),
STRIPE_PUBLISHABLE_KEY: z.string().optional(),
STRIPE_WEBHOOK_SECRET: z.string().optional(),
STRIPE_PRICE_MONTHLY: z.string().optional(),      // e.g. price_xxx
STRIPE_PRICE_ANNUAL: z.string().optional(),        // e.g. price_xxx
STRIPE_PRICE_FOUNDING_ANNUAL: z.string().optional(), // founding member $69/yr
```

#### [MODIFY] [.env.example](file:///home/kaesava/projects/money-matters/.env.example)

**Add** Stripe section:

```bash
# --- Stripe (payments) ---
STRIPE_SECRET_KEY=sk_live_replace_me
STRIPE_PUBLISHABLE_KEY=pk_live_replace_me
STRIPE_WEBHOOK_SECRET=whsec_replace_me
STRIPE_PRICE_MONTHLY=price_replace_me
STRIPE_PRICE_ANNUAL=price_replace_me
STRIPE_PRICE_FOUNDING_ANNUAL=price_replace_me
```

#### [MODIFY] [app-registry.ts](file:///home/kaesava/projects/money-matters/packages/config/src/app-registry.ts)

No feature changes. The `premiumEnabled: false` default stays — subscription status is the source of truth, not this flag. (The `premiumEnabled` flag will be set `true` when a tenant subscribes, via `activate-subscription` command.)

---

### Component 4 — `packages/i18n`

#### [MODIFY] [en.ts](file:///home/kaesava/projects/money-matters/packages/i18n/src/dictionaries/en.ts)

**Add** new top-level `subscription` namespace and `billing` namespace to the English dictionary:

```typescript
subscription: {
  trialActive: "Free Trial",
  trialDaysRemaining: "{days} days remaining",
  trialDayRemaining: "{days} day remaining",
  trialEndsToday: "Trial ends today",
  trialExpired: "Trial ended",
  trialGracePeriod: "Read-only mode",
  freeTier: "Free Plan",
  subscribed: "Household Plan",
  pastDue: "Payment overdue",
  deactivated: "Account paused",
  bannerSoft: "Your free trial ends in {days} days — upgrade to keep full access.",
  bannerUrgent: "Only {days} day(s) left — upgrade now to keep editing your budget.",
  bannerExpired: "Your trial has ended. Upgrade or continue with the free plan.",
  bannerGrace: "Your trial has ended. You can view your budget but not make changes.",
  bannerPastDue: "Payment failed — please update your card to keep full access.",
  upgradeCta: "Upgrade",
  manageBillingCta: "Manage billing",
  startTrial: "Start 30-day free trial",
  trialEndedModalTitle: "Your free trial has ended",
  trialEndedModalBody: "You're now on the free plan. You still have access to your budgets and {days} days of transaction history. Upgrade anytime to unlock full access.",
  trialEndedModalCta: "See what's included in Household",
  trialEndedModalDismiss: "Continue with free plan",
  upgradePageTitle: "Choose your plan",
  upgradePageSubtitle: "Start free. Upgrade when you're ready.",
  freePlanName: "Free",
  freePlanPrice: "No cost, forever",
  householdPlanName: "Household",
  householdPlanMonthlyPrice: "$9.99 AUD / month",
  householdPlanAnnualPrice: "$89 AUD / year",
  householdPlanAnnualSaving: "Save 26%",
  foundingMemberBadge: "Founding member — $69/year, locked forever",
  foundingMemberCta: "Claim founding member price",
  foundingMemberSeatsLeft: "Only {remaining} founding member spots left",
  featureHistoryFree: "90 days transaction history",
  featureHistoryPaid: "Full transaction history",
  featureGoalsFree: "Up to 3 savings goals",
  featureGoalsPaid: "Unlimited savings goals",
  featureCsvImportFree: "CSV import not included",
  featureCsvImportPaid: "CSV import (Big 4 AU banks)",
  featureFileNotesFree: "File notes not included",
  featureFileNotesPaid: "File notes & attachments",
  featureNotifications: "Smart notifications",
  featureBudgeting: "Full budgeting suite",
  lockedHistoryTitle: "Full history available on Household",
  lockedHistoryBody: "You're viewing your last 90 days. Upgrade to see all transactions.",
  lockedCsvImportTitle: "CSV import on Household",
  lockedCsvImportBody: "Import bank statements from CBA, Westpac, ANZ, NAB, ING, and Macquarie.",
  lockedGoalTitle: "Unlimited goals on Household",
  lockedGoalBody: "You've reached the 3-goal limit on the free plan. Upgrade to add more.",
  lockedFileNoteTitle: "File notes on Household",
  lockedFileNoteBody: "Attach notes and files to transactions and categories.",
  settingsCurrentPlan: "Current plan",
  settingsTrialEndDate: "Trial ends",
  settingsNextBillingDate: "Next billing",
  settingsFoundingMember: "Founding member ❤️",
  readOnlyNotice: "You're in read-only mode. Upgrade to make changes.",
},
```

---

### Component 5 — `packages/capabilities/billing` **[NEW CAPABILITY]**

New vertical slice following the existing capability pattern. Contains all billing domain logic, Stripe integration, and trial engagement Inngest functions.

#### [NEW] `packages/capabilities/billing/package.json`

```json
{
  "name": "@money-matters/capability-billing",
  "version": "0.0.1",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./src/index.ts"
    }
  },
  "dependencies": {
    "@money-matters/db": "workspace:*",
    "@money-matters/types": "workspace:*",
    "@money-matters/config": "workspace:*",
    "@money-matters/i18n": "workspace:*",
    "stripe": "^17.0.0",
    "inngest": "workspace:*",
    "zod": "workspace:*",
    "drizzle-orm": "workspace:*"
  }
}
```

#### [NEW] `src/queries/get-subscription-status.ts`

```typescript
/**
 * Resolves the current billing/subscription state for a tenant.
 * Derives convenience booleans and daysRemainingInTrial from raw DB columns.
 * Called in tenantProcedure on every authenticated request.
 */
import { eq } from "drizzle-orm";
import { tenants } from "@money-matters/db";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { SubscriptionStatusDto } from "@money-matters/types";
import type { SubscriptionStatusDto as TSubscriptionStatusDto } from "@money-matters/types";

export async function getSubscriptionStatus(
  db: PgDatabase<any, any, any>,
  tenantId: string
): Promise<TSubscriptionStatusDto> {
  const [tenant] = await db
    .select({
      subscriptionStatus: tenants.subscriptionStatus,
      trialEndsAt: tenants.trialEndsAt,
      trialGraceEndsAt: tenants.trialGraceEndsAt,
      subscriptionEndsAt: tenants.subscriptionEndsAt,
    })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (!tenant) {
    throw new Error(`Tenant not found: ${tenantId}`);
  }

  const status = tenant.subscriptionStatus as TSubscriptionStatusDto["status"];
  const now = new Date();
  const daysRemainingInTrial =
    tenant.trialEndsAt
      ? Math.max(0, Math.ceil((tenant.trialEndsAt.getTime() - now.getTime()) / 86_400_000))
      : null;

  return SubscriptionStatusDto.parse({
    status,
    trialEndsAt: tenant.trialEndsAt,
    trialGraceEndsAt: tenant.trialGraceEndsAt,
    subscriptionEndsAt: tenant.subscriptionEndsAt,
    isTrialActive: status === "TRIAL_ACTIVE",
    isTrialGrace: status === "TRIAL_GRACE",
    isFreeTier: status === "FREE_TIER",
    isSubscribed: status === "SUBSCRIBED",
    isPastDue: status === "PAST_DUE",
    isDeactivated: status === "DEACTIVATED",
    daysRemainingInTrial,
  });
}
```

#### [NEW] `src/commands/activate-trial.ts`

Called from `createTenantHandler` immediately after tenant creation:

```typescript
// Sets trial_started_at = now, trial_ends_at = +30d, trial_grace_ends_at = +37d
export async function activateTrialCommand(
  db: PgDatabase<any, any, any>,
  tenantId: string,
  now: Date = new Date()
): Promise<void>
```

#### [NEW] `src/commands/create-checkout-session.ts`

```typescript
// Creates a Stripe Checkout Session for the given priceId.
// Associates stripeCustomerId with the tenant (creates Stripe Customer if first time).
// Returns { url: string } — the Stripe-hosted checkout URL.
export async function createCheckoutSessionCommand(...)
```

#### [NEW] `src/commands/create-customer-portal-session.ts`

```typescript
// Creates a Stripe Customer Portal session for the tenant owner.
// Returns { url: string }.
export async function createCustomerPortalSessionCommand(...)
```

#### [NEW] `src/commands/activate-subscription.ts`

Webhook handler for `checkout.session.completed` and `invoice.payment_succeeded`:
```typescript
// Sets subscriptionStatus = 'SUBSCRIBED', premiumEnabled = true,
// subscribedAt = now, subscriptionEndsAt = period end from Stripe,
// stripeSubscriptionId, stripePriceId.
export async function activateSubscriptionCommand(...)
```

#### [NEW] `src/commands/deactivate-tenant.ts`

Webhook handler for `invoice.payment_failed` after all Stripe retries exhausted:
```typescript
// Sets subscriptionStatus = 'DEACTIVATED', premiumEnabled = false,
// subscriptionEndsAt = now.
// Does NOT set SCHEDULED_DELETION — data is preserved.
export async function deactivateTenantCommand(...)
```

#### [NEW] `src/commands/transition-to-free-tier.ts`

Called by Inngest cron after grace period ends:
```typescript
// Sets subscriptionStatus = 'FREE_TIER', premiumEnabled = false.
// Called for: trial_grace_ends_at < now AND status = 'TRIAL_GRACE'.
export async function transitionToFreeTierCommand(...)
```

#### [NEW] `src/webhooks/stripe-webhook-handler.ts`

```typescript
/**
 * Stripe webhook processor.
 * MUST receive raw request body (not JSON-parsed) for signature verification.
 * All handlers are idempotent (safe to retry).
 */
import Stripe from "stripe";

const HANDLED_EVENTS = [
  "checkout.session.completed",
  "invoice.payment_succeeded",
  "invoice.payment_failed",
  "customer.subscription.deleted",
  "customer.subscription.updated",
] as const;

export async function handleStripeWebhook(
  rawBody: string,
  signature: string,
  webhookSecret: string,
  db: PgDatabase<any, any, any>
): Promise<{ processed: boolean; eventType: string }>
```

Idempotency: check `stripe_subscription_id` before writing. If state is already correct, return early without error (safe retry).

#### [NEW] `src/inngest/engage-trial-user.ts`

30-day email nurture sequence. Triggered by `billing/trial.started` event on tenant creation:

```typescript
// Uses step.sleep() delays for each scheduled email.
// Skips steps if tenant has already subscribed (check status before each send).
// Emails sent via Resend using templates in packages/i18n.
export const engageTrialUser = inngest.createFunction(
  { id: "engage-trial-user", name: "Trial Engagement Sequence" },
  { event: "billing/trial.started" },
  async ({ event, step }) => {
    // Day 0: Welcome email (immediate)
    // Day 1: Onboarding incomplete nudge
    // Day 3: First income event nudge
    // Day 7: Weekly digest (first)
    // Day 10: CSV import prompt
    // Day 14: 2-week milestone
    // Day 21: Goal check
    // Day 25: Trial warning (soft)
    // Day 28: Trial warning (firm)
    // Day 29: Trial last day
    // Day 30: Trial expired — explain free tier
    // Day 37: Grace ended — confirm free tier state
  }
);
```

#### [NEW] `src/inngest/transition-expired-trials.ts`

Daily cron to move `TRIAL_ACTIVE` → `TRIAL_GRACE` and `TRIAL_GRACE` → `FREE_TIER`:

```typescript
// Cron: '0 0 * * *' (midnight UTC = 10am AEST)
// Step 1: Find tenants where trial_ends_at < now AND status = 'TRIAL_ACTIVE'
//         → set status = 'TRIAL_GRACE'
// Step 2: Find tenants where trial_grace_ends_at < now AND status = 'TRIAL_GRACE'
//         → call transitionToFreeTierCommand() for each
export const transitionExpiredTrials = inngest.createFunction(...)
```

#### [NEW] `src/inngest/handle-past-due-escalation.ts`

```typescript
// Triggered by Stripe 'invoice.payment_failed' event (via billing/payment.failed Inngest event).
// Sets status = 'PAST_DUE'.
// After 7 days (Stripe exhausts retries), Stripe sends 'customer.subscription.deleted'
// → webhook handler calls deactivateTenantCommand().
export const handlePastDueEscalation = inngest.createFunction(...)
```

#### [NEW] `src/index.ts`

Exports all commands, queries, webhook handler, and Inngest functions.

---

### Component 6 — `packages/capabilities/tenant`

#### [MODIFY] [index.ts](file:///home/kaesava/projects/money-matters/packages/capabilities/tenant/src/index.ts)

**Change 1:** After successful tenant insert, call `activateTrialCommand` and fire `billing/trial.started` Inngest event:

```typescript
// After tenant + owner insert:
await activateTrialCommand(db, tenantId);

// Fire Inngest event to start 30-day engagement sequence
await inngest.send({
  name: "billing/trial.started",
  data: { tenantId, appId, userEmail }, // userEmail from auth context for emails
});
```

**Change 2:** Remove `invitePartner` and `acceptInvite` from the exported tRPC router surface. The handler functions remain but are not registered on the router.

---

### Component 7 — `apps/api`

#### [MODIFY] [trpc.ts](file:///home/kaesava/projects/money-matters/apps/api/src/trpc/trpc.ts)

**Update `tenantProcedure`** to load subscription status and add it to context:

```typescript
export const tenantProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.tenantId || !ctx.appId) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: '...' });
  }

  return await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${ctx.tenantId}, true)`);

    // Load subscription status for every authenticated request.
    // ~1–2ms overhead on Neon serverless; acceptable at launch scale.
    const subscriptionStatus = await getSubscriptionStatus(tx, ctx.tenantId);

    // Hard block: DEACTIVATED tenants cannot use the API at all
    if (subscriptionStatus.isDeactivated) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'subscription_deactivated' });
    }

    return next({
      ctx: {
        ...ctx,
        db: tx,
        tenantId: ctx.tenantId,
        appId: ctx.appId,
        userId: ctx.userId,
        subscriptionStatus, // available in all downstream procedures
      },
    });
  });
});

// Helper: throw if tenant is in read-only grace period
export function requiresWriteAccess(ctx: { subscriptionStatus: SubscriptionStatusDto }) {
  if (ctx.subscriptionStatus.isTrialGrace) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'subscription_read_only' });
  }
}

// Helper: throw if feature is not available on free tier
export function requiresPaidTier(ctx: { subscriptionStatus: SubscriptionStatusDto }, feature: string) {
  if (ctx.subscriptionStatus.isFreeTier || ctx.subscriptionStatus.isTrialGrace) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: `subscription_free_tier_limit:${feature}`,
    });
  }
}
```

#### [NEW] [billing.router.ts](file:///home/kaesava/projects/money-matters/apps/api/src/routers/billing.router.ts)

```typescript
export const billingRouter = {
  getSubscriptionStatus: tenantProcedure.query(async ({ ctx }) => {
    return ctx.subscriptionStatus; // already loaded in procedure
  }),

  createCheckoutSession: tenantProcedure
    .input(CreateCheckoutSessionCommand)
    .mutation(async ({ ctx, input }) => {
      // Only OWNER can initiate checkout
      await assertTenantOwner(ctx);
      return createCheckoutSessionCommand(ctx.db, ctx.tenantId, ctx.userId, input);
    }),

  createCustomerPortalSession: tenantProcedure
    .input(CreateCustomerPortalCommand)
    .mutation(async ({ ctx, input }) => {
      await assertTenantOwner(ctx);
      return createCustomerPortalSessionCommand(ctx.db, ctx.tenantId, input);
    }),
};
```

#### [MODIFY] [_app.ts](file:///home/kaesava/projects/money-matters/apps/api/src/routers/_app.ts)

**Add** `billingRouter` to the composed `appRouter`.

#### [MODIFY] [worker.ts](file:///home/kaesava/projects/money-matters/apps/api/src/worker.ts)

**Add** Stripe env vars to `WorkerEnv` interface:

```typescript
STRIPE_SECRET_KEY?: string;
STRIPE_WEBHOOK_SECRET?: string;
STRIPE_PRICE_MONTHLY?: string;
STRIPE_PRICE_ANNUAL?: string;
STRIPE_PRICE_FOUNDING_ANNUAL?: string;
```

#### [MODIFY] [index.ts](file:///home/kaesava/projects/money-matters/apps/api/src/index.ts)

**Add** a raw-body Stripe webhook Fastify route. Must be registered before Fastify's default JSON body parser to preserve raw body for signature verification:

```typescript
// Stripe webhook — raw body REQUIRED for signature verification
fastify.post('/webhooks/stripe', {
  config: { rawBody: true },
}, async (request, reply) => {
  const signature = request.headers['stripe-signature'] as string;
  if (!signature) {
    return reply.status(400).send({ error: 'Missing stripe-signature header' });
  }

  const result = await handleStripeWebhook(
    request.rawBody as string,
    signature,
    env.STRIPE_WEBHOOK_SECRET!,
    db
  );

  return reply.status(200).send({ received: true, ...result });
});
```

Rate limiting: **exempt** from Upstash rate limiter (Stripe IPs are known; rate limit would cause false drops during high event volume).

#### [MODIFY] Per-router free-tier gates

Apply `requiresWriteAccess()` and `requiresPaidTier()` calls in:

| Router | Mutation | Gate |
|---|---|---|
| `transactions.router.ts` | `importCsvTransactions` | `requiresPaidTier(ctx, 'csv_import')` |
| `transactions.router.ts` | `listTransactions` query | Filter: if `FREE_TIER`, add `AND recorded_at > now() - interval '90 days'` |
| `file-notes.router.ts` | `createFileNote`, `uploadAttachment` | `requiresPaidTier(ctx, 'file_notes')` |
| `categories.router.ts` | `createCategory` (type=GOAL) | Check goal count ≤ 3 for `FREE_TIER`, else `requiresPaidTier(ctx, 'goal_limit')` |
| All mutation procedures | All writes | `requiresWriteAccess(ctx)` at top of every `.mutation()` handler |

---

### Component 8 — `apps/web`

#### [MODIFY] [middleware.ts](file:///home/kaesava/projects/money-matters/apps/web/src/middleware.ts)

**Add** `/subscription` to public prefixes. **Add** matcher for `/subscription/:path*`:

```typescript
const PUBLIC_PREFIXES = [
  "/sign-in",
  "/sign-up",
  "/auth-callback",
  "/reset-password",
  "/invite/",
  "/api/",
  "/subscription/",  // NEW — upgrade, success, manage pages are accessible
];

// Matcher addition:
matcher: ["/dashboard/:path*", "/setup/:path*", "/subscription/:path*"],
```

Note: subscription status redirect (DEACTIVATED → read-only notice) is handled client-side in the dashboard layout via the `useSubscriptionStatus` hook, not in the Edge middleware (avoids the extra DB call on every Edge request).

#### [NEW] `src/hooks/useSubscriptionStatus.ts`

React Query hook wrapping `trpc.getSubscriptionStatus.useQuery()`. Returns `SubscriptionStatusDto`. Used throughout the web app to conditionally render gates and banners.

#### [NEW] `src/components/TrialStatusBadge.tsx`

Sidebar badge component. Logic:
- Hidden if `SUBSCRIBED`
- Days 0–20: subtle green chip — `"Trial: {X}d"`
- Days 21–27: amber chip — `"Trial: {X}d"`
- Days 28–30: red chip — `"Trial: {X}d"`
- `TRIAL_GRACE`: red chip — `"Read-only mode"`
- `FREE_TIER`: subtle grey chip — `"Free plan"`
- `PAST_DUE`: amber chip — `"Payment overdue"`

#### [NEW] `src/components/TrialBanner.tsx`

Full-width persistent banner. Logic:
- Hidden days 0–20
- Visible days 21–37 (trial + grace period)
- Visible when `PAST_DUE`
- Message varies by state (uses i18n `subscription.bannerSoft/Urgent/Expired/Grace/PastDue`)
- Contains `[Upgrade]` button → `/subscription/upgrade`
- Dismissible per session (`sessionStorage` flag), re-appears on next session

#### [NEW] `src/components/UpgradePromptModal.tsx`

Modal shown when a FREE_TIER or TRIAL_GRACE user attempts a gated action. Props: `feature: 'csv_import' | 'file_notes' | 'goal_limit' | 'history'`. Renders feature-specific locked message from i18n, with `[Upgrade]` CTA and `[Not now]` dismiss.

#### [NEW] `src/components/TrialEndedModal.tsx`

One-time modal shown on first render after trial grace has ended. Check via `localStorage` flag `mm_trial_ended_acknowledged`. Renders `subscription.trialEndedModalTitle/Body/Cta/Dismiss`. Sets flag on dismiss so it never shows again.

#### [NEW] `src/app/subscription/upgrade/page.tsx`

Pricing page. Structure:
- Monthly / Annual toggle (`useState`)
- Free plan card (left)
- Household plan card with founding member pricing callout (right, highlighted)
- Feature comparison table
- `[Start Household]` button → calls `trpc.billing.createCheckoutSession.mutate({ priceId, successUrl, cancelUrl })` → redirects to returned Stripe Checkout URL
- Uses all i18n `subscription.*` keys
- Uses Serene Finance design tokens (no hardcoded colours)

#### [NEW] `src/app/subscription/success/page.tsx`

Post-checkout success page:
- Shows "You're on Household 🎉" confirmation
- Displays next billing date (from `useSubscriptionStatus`)
- `[Back to dashboard]` button
- Auto-redirects to `/dashboard` after 5 seconds

#### [NEW] `src/app/subscription/manage/page.tsx`

Billing portal page:
- Calls `trpc.billing.createCustomerPortalSession.mutate()` on mount
- Redirects immediately to returned Stripe Customer Portal URL
- Shows loading spinner while redirect is pending
- Accessible from Settings → Subscription section

#### [MODIFY] Dashboard layout file *(inspect during execution — likely `src/app/dashboard/layout.tsx`)*

**Add** `<TrialBanner />` below the `<TopNavBar />`. **Add** `<TrialEndedModal />` (renders conditionally). These wrap the dashboard shell.

#### [MODIFY] Sidebar component *(inspect during execution — likely in `packages/ui` or `apps/web/src/components/SideNavBar.tsx`)*

**Add** `<TrialStatusBadge />` below the nav links, above the user profile section.

#### [MODIFY] Settings page *(inspect during execution — `src/app/dashboard/settings/page.tsx`)*

**Add** Subscription section showing:
- Current plan name
- Trial end date (if applicable)
- Next billing date (if subscribed)
- `[Upgrade]` button → `/subscription/upgrade` (if not subscribed)
- `[Manage billing]` button → `/subscription/manage` (if subscribed)
- "Founding member ❤️" badge if on founding member price

#### [MODIFY] CSV import UI *(inspect during execution)*

Wrap import trigger with subscription gate. If `FREE_TIER` or `TRIAL_GRACE`, show `<UpgradePromptModal feature="csv_import" />` instead of starting the import flow.

#### [MODIFY] File notes UI *(inspect during execution)*

Gate `createFileNote` and attachment upload buttons behind `<UpgradePromptModal feature="file_notes" />` for non-paid tiers.

#### [MODIFY] Goals/category creation UI *(inspect during execution)*

After 3 Goal categories exist on `FREE_TIER`, show `<UpgradePromptModal feature="goal_limit" />` when user tries to create a 4th.

#### [MODIFY] Transaction history UI *(inspect during execution)*

For `FREE_TIER` tenants, transactions older than 90 days render as a blurred locked card with upgrade prompt (not hidden — the data exists, it's shown as locked). This requires the `listTransactions` API to return a metadata flag `isHistoryLimited: boolean` so the UI knows to render the locked state below the 90-day boundary.

#### [MODIFY] [page.tsx](file:///home/kaesava/projects/money-matters/apps/web/src/app/page.tsx) (landing page)

**Add** a pricing section between the feature grid and the conversion banner. Structure:
- Section heading: `"Simple, honest pricing"`
- Free card + Household card (same layout as `/subscription/upgrade`)
- Founding member callout below the Household card
- All strings via i18n

**Remove** or make conditional any partner invite UI in the dashboard settings (if visible — confirm during execution).

---

### Component 9 — `apps/mobile`

#### [MODIFY] Settings screen *(inspect during execution — likely `apps/mobile/src/screens/SettingsScreen.tsx`)*

**Add** Subscription section:
- Current plan display
- Trial days remaining (if in trial)
- `[Upgrade]` → deep link to `https://moneymatters.kaesava.au/subscription/upgrade` (web handoff, V1)

#### [NEW] `src/components/UpgradePromptBottomSheet.tsx`

Bottom sheet shown when a FREE_TIER or TRIAL_GRACE mobile user taps a gated action. Same logic as web `UpgradePromptModal` but as a native bottom sheet. Contains feature description + `[Upgrade — opens browser]` button.

#### [MODIFY] Dashboard screen

**Add** trial status indicator in the app header or below the `DashboardHeroCard` for days 21+.

---

### Component 10 — PostHog (Anonymous Analytics)

#### [MODIFY] `apps/web` — add PostHog provider

Install `posthog-js`. Wrap in a `PostHogProvider` in the root layout. Configure with `person_profiles: 'never'` (anonymous mode — no user IDs sent):

```typescript
posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  api_host: 'https://app.posthog.com',
  person_profiles: 'never',    // anonymous — no PII
  capture_pageview: true,
  capture_pageleave: true,
});
```

**Add** `NEXT_PUBLIC_POSTHOG_KEY` to env schema + `.env.example`.

**Fire events** at each key lifecycle point (no PII in properties):
```typescript
posthog.capture('trial_started');
posthog.capture('onboarding_completed');
posthog.capture('first_income_recorded');
posthog.capture('first_allocation_run');
posthog.capture('csv_import_completed');
posthog.capture('upgrade_prompt_shown', { feature });
posthog.capture('upgrade_page_viewed');
posthog.capture('checkout_started', { plan: 'monthly' | 'annual' | 'founding' });
posthog.capture('subscription_activated');
posthog.capture('trial_expired');
posthog.capture('free_tier_activated');
```

#### [MODIFY] `apps/mobile` — add PostHog

Install `posthog-react-native`. Same anonymous config. Same events.

---

## Pre-Launch Business Setup (Manual — Not Code)

These steps must be completed before Phase 2 begins:

- [ ] Register ABN as sole trader at [business.gov.au](https://www.business.gov.au) (free, 10 min)
- [ ] Open dedicated business bank account (separate from personal)
- [ ] Create Stripe account at [stripe.com](https://stripe.com), verify with ABN + bank account
- [ ] Create Products & Prices in Stripe Dashboard:
  - `Money Matters Household` — $9.99 AUD / month (recurring) → `STRIPE_PRICE_MONTHLY`
  - `Money Matters Household` — $89.00 AUD / year (recurring) → `STRIPE_PRICE_ANNUAL`
  - `Founding Member` — $69.00 AUD / year (recurring, limited coupon or separate price) → `STRIPE_PRICE_FOUNDING_ANNUAL`
- [ ] Configure Stripe Smart Retries (Settings → Revenue Recovery)
- [ ] Configure Stripe Customer Portal (Settings → Billing → Customer Portal → enable cancel, update payment)
- [ ] Register Stripe webhook endpoint: `https://api.moneymatters.kaesava.au/webhooks/stripe`
  - Select events: `checkout.session.completed`, `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.deleted`, `customer.subscription.updated`
- [ ] Copy webhook signing secret → `STRIPE_WEBHOOK_SECRET`
- [ ] Add all Stripe env vars to Cloudflare Workers secrets (`wrangler secret put`)
- [ ] Add all Stripe env vars to GitHub Actions secrets (for CI)
- [ ] Create PostHog account at [posthog.com](https://posthog.com) (free tier is ample)
- [ ] Add `NEXT_PUBLIC_POSTHOG_KEY` to env

---

## Phased Delivery

| Phase | Scope | Est. Effort |
|---|---|---|
| **1** | DB migration 0011, Drizzle schema, `SubscriptionStatus` Zod enum, `TenantSchema` update | 1 day |
| **2** | `packages/config` Stripe env vars, `packages/capabilities/billing` scaffold: `get-subscription-status`, `activate-trial`, `activate-subscription`, `deactivate-tenant`, `transition-to-free-tier`, `stripe-webhook-handler` | 2 days |
| **3** | `createTenantHandler` trial injection, `tenantProcedure` subscription gating, `billingRouter`, Fastify webhook route, per-router free-tier gates | 2 days |
| **4** | Web UI: `useSubscriptionStatus`, `TrialStatusBadge`, `TrialBanner`, `UpgradePromptModal`, `TrialEndedModal`, `/subscription/upgrade`, `/subscription/success`, `/subscription/manage`, settings section, landing page pricing section | 3 days |
| **5** | Free-tier UI gates: CSV import, file notes, goal limit, blurred history | 1 day |
| **6** | Inngest: `engage-trial-user` 30-day sequence, `transition-expired-trials` cron, `handle-past-due-escalation` | 2 days |
| **7** | PostHog anonymous install (web + mobile), mobile trial status + `UpgradePromptBottomSheet`, i18n string audit | 1 day |
| | **Total** | **~12 days** |

---

## Verification Plan

### Automated Tests

```bash
# Run all tests after implementation
pnpm turbo test

# Specific new test files to create:
# packages/capabilities/billing/src/queries/get-subscription-status.test.ts
# packages/capabilities/billing/src/commands/activate-trial.test.ts
# packages/capabilities/billing/src/webhooks/stripe-webhook-handler.test.ts
# packages/capabilities/billing/src/inngest/transition-expired-trials.test.ts
```

**Test coverage required:**
- `getSubscriptionStatus` — correct DTO for each status value
- `activateTrialCommand` — correct date arithmetic (trial = +30d, grace = +37d)
- `transitionExpiredTrials` — TRIAL_ACTIVE → TRIAL_GRACE → FREE_TIER state transitions
- `stripeWebhookHandler` — idempotency (second identical event is a no-op)
- `tenantProcedure` gate — DEACTIVATED throws FORBIDDEN, TRIAL_GRACE blocks mutations
- Free-tier gates — goal count > 3 throws correct error, CSV import gate fires

### Stripe Test Mode End-to-End

1. Use Stripe test card `4242 4242 4242 4242` to complete checkout
2. Verify `checkout.session.completed` webhook fires → `subscription_status = 'SUBSCRIBED'`
3. Use Stripe test card `4000 0000 0000 0002` (decline) → verify PAST_DUE flow
4. Use Stripe CLI: `stripe trigger invoice.payment_failed` → verify escalation
5. Cancel subscription in Customer Portal → verify `FREE_TIER` transition at period end

### Manual Verification

- Sign up → verify `trial_started_at` and `trial_ends_at` populated in DB
- Day 25 simulation (set `trial_ends_at = now() + 5d` in test DB) → verify amber banner appears
- Day 30 simulation → verify read-only mode, write actions blocked, `UpgradePromptModal` shown
- Day 37 simulation → verify `FREE_TIER` status, `TrialEndedModal` shown on next login
- Free tier: attempt CSV import → locked state shown, API returns `subscription_free_tier_limit:csv_import`
- Free tier: create 4th goal → `UpgradePromptModal` shown
- Free tier: transaction history > 90 days → blurred card with upgrade prompt rendered
- PostHog: open [app.posthog.com](https://app.posthog.com), verify `trial_started` event captured anonymously
