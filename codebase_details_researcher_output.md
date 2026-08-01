Money Matters Codebase Research Report
Here are the exact file-level details gathered from the money-matters monorepo as requested.

1. packages/capabilities/tenant/src/
File List:

packages/capabilities/tenant/src/index.ts
packages/capabilities/tenant/src/index.test.ts
packages/capabilities/tenant/src/index.d.ts (built types)
packages/capabilities/tenant/src/index.test.d.ts
createTenantHandler Details:

Signature: export function createTenantHandler(db: PgDatabase<any, any, any>): (input: z.infer<typeof CreateTenantCommand>, appId: string, userId: string) => Promise<{ success: boolean; tenantId: string }>
Return Shape: { success: true, tenantId: string }
Internal Mechanics:
Pre-generates tenant UUID via crypto.randomUUID().
Inserts tenant into tenants table with id = tenantId and tenantId = tenantId (a tenant is its own scope).
Inserts owner membership into tenantUsers with role: "OWNER" and inviteStatus: "ACCEPTED".
Queries appCategories matching appId. If template categories exist, populates default categories into categories table with converted monthly amounts (annualisedAmount / 12), sets the first EVERYDAY category to isDefaultExcess = true, isDefaultSavings = false, isCommitted = false.
2. apps/api/src/
File Structure:

apps/api/src/index.ts
apps/api/src/worker.ts
apps/api/src/trpc/trpc.ts
apps/api/src/trpc/context.ts
apps/api/src/trpc/edge-context.ts
apps/api/src/routers/_app.ts
apps/api/src/routers/tenant.router.ts
apps/api/src/routers/categories.router.ts
apps/api/src/routers/expenses.router.ts
apps/api/src/routers/file-notes.router.ts
apps/api/src/routers/income.router.ts
apps/api/src/routers/notifications.router.ts
apps/api/src/routers/payday.router.ts
apps/api/src/routers/transactions.router.ts
tenantProcedure Definition (apps/api/src/trpc/trpc.ts):

typescript


export const tenantProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.tenantId || !ctx.appId) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Multi-tenancy boundary isolation violation: Missing or invalid verified session tracking parameters.',
    });
  }
  return await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${ctx.tenantId}, true)`);
    return next({
      ctx: {
        ...ctx,
        db: tx, // transactional database client with RLS active
        tenantId: ctx.tenantId,
        appId: ctx.appId,
        userId: ctx.userId,
      },
    });
  });
});
Main Router Composition (apps/api/src/routers/_app.ts):

typescript


import { router } from '../trpc/trpc.js';
import { tenantRouter } from './tenant.router.js';
import { categoriesRouter } from './categories.router.js';
import { incomeRouter } from './income.router.js';
import { expensesRouter } from './expenses.router.js';
import { paydayRouter } from './payday.router.js';
import { transactionsRouter } from './transactions.router.js';
import { notificationsRouter } from './notifications.router.js';
import { fileNotesRouter } from './file-notes.router.js';
export const appRouter = router({
  ...tenantRouter,
  ...categoriesRouter,
  ...incomeRouter,
  ...expensesRouter,
  ...paydayRouter,
  ...transactionsRouter,
  ...notificationsRouter,
  ...fileNotesRouter,
});
export type AppRouter = typeof appRouter;
3. apps/web/src/middleware.ts (Full Content)
typescript


import { NextRequest, NextResponse } from "next/server";
// Paths that are accessible without authentication
const PUBLIC_PREFIXES = [
  "/sign-in",
  "/sign-up",
  "/auth-callback",
  "/reset-password",
  "/invite/",
  "/api/",
];
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Allow root landing page
  if (pathname === "/") {
    return NextResponse.next();
  }
  // Allow all public paths
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }
  // Check for Neon Auth / Better Auth session cookies
  const sessionCookie =
    request.cookies.get("__Secure-neon-auth.session_token") ??
    request.cookies.get("neon-auth.session_token") ??
    request.cookies.get("better-auth.session_token") ??
    request.cookies.get("__Secure-better-auth.session_token") ??
    request.cookies.get("session_token") ??
    request.cookies.get("__Secure-session_token") ??
    request.cookies.get("neon_auth_session");
  if (!sessionCookie) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(signInUrl);
  }
  return NextResponse.next();
}
export const config = {
  // Only run on protected paths — do NOT apply to _next static assets
  matcher: ["/dashboard/:path*", "/setup/:path*"],
};
4. apps/web/src/app/page.tsx
Total Lines: 159 lines
General Structure:
Client side page ("use client").
Auth check on mount (useEffect checking localStorage.getItem("session_token"), redirecting to /dashboard if present).
header: Sticky top bar with logo (⬡), app title t("app.title"), "Sign In", and "Get Started Free" buttons.
hero section: Headline with i18n tokens (t("landing.heroTitlePart1")), description, and CTA buttons ("Create Account", "Try Simulator").
PaycheckSimulator: Embedded interactive <PaycheckSimulator /> component.
feature grid: 3 feature cards (Financial clarity, Traffic light allocation, Alerting).
conversion banner: Call-to-action banner linking to /sign-up.
footer: Copyright notice, email support link (info@kaesava.au), and privacy policy link.
5. apps/web/src/app/sign-up/page.tsx (Full Content)
typescript


"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { t } from "@money-matters/i18n";
import { Button, Input } from "@money-matters/ui/web";
import { authClient } from "../../lib/auth";
import { trpc } from "../../lib/trpc";
export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createTenant = trpc.createTenant.useMutation();
  useEffect(() => {
    // If already signed in, push to dashboard
    const token = localStorage.getItem("session_token");
    if (token) {
      router.push("/dashboard");
    }
  }, [router]);
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !confirmPassword || !name) {
      setError("Please fill in all fields.");
      return;
    }
    if (password.length < 8) {
      setError(t("auth.passwordTooShort", { defaultValue: "Password must be at least 8 characters long." }));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("auth.passwordsMustMatch", { defaultValue: "Passwords do not match." }));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // 1. Create the Better Auth account
      const signUpResult = await authClient.signUp.email({
        email: email.trim().toLowerCase(),
        password,
        name: name.trim(),
      });
      if (signUpResult.error) {
        setError(signUpResult.error.message || "Failed to create account. Please try again.");
        return;
      }
      const sessionToken = signUpResult.data?.token;
      if (sessionToken) {
        localStorage.setItem("session_token", sessionToken);
      }
      // 2. Create the tenant/household (uses transactional token context)
      await createTenant.mutateAsync({
        name: name.trim(),
      });
      // 3. Complete onboarding signup redirects
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign up.");
    } finally {
      setLoading(false);
    }
  };
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: window.location.origin + "/dashboard",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign up with Google.");
      setLoading(false);
    }
  };
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 min-h-screen p-8">
      <main className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg border border-zinc-100 flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-[#1B2B4B]">{t("auth.signUp")}</h1>
          <p className="text-sm text-zinc-500">{t("app.description")}</p>
        </div>
        {error && (
          <div className="ui-alert border-rose-200 bg-rose-50 text-rose-800 text-sm font-semibold rounded-lg p-3">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}
        <form onSubmit={handleSignUp} className="flex flex-col gap-4">
          <Input
            label={t("auth.nameLabel")}
            placeholder={t("auth.namePlaceholder")}
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            type="text"
            required
            disabled={loading}
          />
          <Input
            label={t("auth.emailLabel")}
            placeholder={t("auth.emailPlaceholder")}
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            type="email"
            required
            disabled={loading}
          />
          <Input
            label={t("auth.passwordLabel")}
            placeholder={t("auth.passwordPlaceholder")}
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            type="password"
            required
            disabled={loading}
          />
          <Input
            label="Confirm Password"
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
            type="password"
            required
            disabled={loading}
          />
          <Button type="submit" className="w-full mt-2" disabled={loading}>
            {loading ? "Creating Account..." : t("auth.signUpCta")}
          </Button>
        </form>
        <div className="flex items-center my-2">
          <div className="flex-1 h-[1px] bg-zinc-200"></div>
          <span className="px-3 text-xs font-semibold text-zinc-400 uppercase">{t("auth.or")}</span>
          <div className="flex-1 h-[1px] bg-zinc-200"></div>
        </div>
        <button
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center gap-3 bg-white border border-zinc-200 hover:bg-zinc-50 transition-colors py-2.5 rounded-lg text-sm font-semibold text-zinc-700 disabled:opacity-50"
          disabled={loading}
        >
          <span className="text-lg font-bold text-blue-500">G</span>
          Sign up with Google
        </button>
        <div className="flex justify-center gap-1.5 text-sm mt-2">
          <span className="text-zinc-500">Already have an account?</span>
          <button
            onClick={() => router.push("/sign-in")}
            className="font-bold text-[#00B4A6]"
          >
            {t("auth.signInCta")}
          </button>
        </div>
      </main>
    </div>
  );
}
6. packages/capabilities/notifications/src/
File List:
packages/capabilities/notifications/src/index.ts
packages/capabilities/notifications/src/email.ts
packages/capabilities/notifications/src/inngest.ts
packages/capabilities/notifications/src/scheduled-notifications.ts
packages/capabilities/notifications/src/mobile/
Inngest Function Structure:
inngest.ts: createNotificationFunctions(inngest: Inngest) exports sendPushNotification handling event notification/send-push by querying deviceTokens and POSTing to Expo Push API (https://exp.host/--/api/v2/push/send).
scheduled-notifications.ts: createScheduledNotificationFunctions(inngest: Inngest) exports 6 scheduled / event-driven workflows:
notifyPaydayIncoming (cron: '0 8 * * *' - 6pm AEST)
notifyBillDueSoon (cron: '0 23 * * *' - 9am AEST)
notifyBillOverdue (cron: '0 0 * * *' - 10am AEST)
notifyWeeklyDigest (cron: '0 9 * * 0' - Sun 7pm AEST)
notifyGoalMilestone (event: 'transaction/recorded')
notifySpendingVelocity (cron: '0 8 * * *')
7. packages/types/src/index.ts & commands.types.ts
Primary Schema Exports in index.ts:
BaseSchema: z.object({ id: z.string().uuid(), tenantId: z.string().uuid(), appId: z.string().uuid(), createdAt: z.date(), createdBy: z.string().uuid(), updatedAt: z.date(), updatedBy: z.string().uuid(), archivedAt: z.date().nullable() }).strict()
TenantSchema, TenantMemberSchema, BankAccountSchema, CategorySchema, CategoryScheduleSchema, IncomeSourceSchema, IncomeSourceScheduleSchema, IncomeEventSchema, AllocationPlanSchema, AllocationPlanLineSchema, TransactionLedgerSchema.
Queries: ListTransactionsQuery, ListCategoryTransactionsQuery, CanAffordQuery.
DTOs: CanAffordVerdictDto (discriminated union), MonthlySummaryDto.
User Preferences: UserPreferencesSchema.
Command Schemas in commands.types.ts:
CreateTenantCommand, UpdateTenantCommand, CreateBankAccountCommand, UpdateBankAccountCommand, CreateCategoryCommand, UpdateCategoryCommand, CreateIncomeSourceCommand, RecordExpenseCommand, MoveMoneyCommand, ConfirmPaydayCommand, InvitePartnerCommand, AcceptInviteCommand, SyncLedgerMutationCommand, WaterfallExecutionPayload.
8. packages/db/src/schema/base.ts (Full Content)
typescript


import { timestamp, uuid } from "drizzle-orm/pg-core";
export const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid("created_by").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid("updated_by").notNull(),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  archivedBy: uuid("archived_by"),
};
export const tenantAndTimestamps = {
  tenantId: uuid("tenant_id").notNull(),
  appId: uuid("app_id").notNull(),
  ...timestamps
};
9. packages/i18n/src/
File List:
packages/i18n/src/index.ts
packages/i18n/src/dictionaries/en.ts
Dictionary Structure:
Nested dictionary object translations = { en } as const.
t(key: TranslationKey, optionsOrLocale?: ...) resolves dot-notated paths (e.g. t("landing.heroTitlePart1")) traversing the dictionary object.
Supports string interpolation (e.g. {step}) and defaultValue fallback.
10. packages/db/drizzle/
Existing Migrations:
0000_graceful_lady_mastermind.sql
0001_short_ken_ellis.sql
0002_gray_lenny_balinger.sql
0003_enable_rls.sql
0003_schema_refactor.sql
0004_remove_household_id.sql
0005_category_last_notified_at.sql
0006_schema_v2_cleanup.sql
0007_add_income_event_note_fields.sql
0008_add_tenant_users_invite_columns.sql
0009_user_preferences_app_jsonb.sql
0010_add_app_categories.sql
Next Migration Number: 0011 (e.g., 0011_xxxx.sql).
11. packages/config/src/app-registry.ts (Full Content)
typescript


export interface AppConfig {
  id: string;
  name: string;
  slug: string;
  features: {
    premiumEnabled: boolean;
    partnerInvite: boolean;
    offlineSync: boolean;
    canAffordCalculator: boolean;
  };
}
const REGISTRY: Record<string, AppConfig> = {
  "01908bde-34bb-7b19-a178-574211bc93aa": {
    id: "01908bde-34bb-7b19-a178-574211bc93aa",
    name: "Money Matters",
    slug: "money-matters",
    features: {
      premiumEnabled: false,
      partnerInvite: false,
      offlineSync: false,
      canAffordCalculator: true,
    },
  },
};
export function resolveAppConfig(appId: string): AppConfig | null {
  return REGISTRY[appId] || null;
}
