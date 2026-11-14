import { eq } from "drizzle-orm";
import { router, privateTenantProcedure } from "../trpc/trpc.js";
import {
  AssistantAskInputSchema,
  AssistantResultSchema,
  AssistantUsageSchema,
  DEFAULT_APP_FEATURE_FLAGS,
} from "@money-matters/types";
import {
  askAssistant,
  DbUsageStore,
  CloudflareGatewayLlmProvider,
} from "@money-matters/capability-assistant";
import { checkAiTenantRateLimit } from "@money-matters/core";
import { AI_TIER_LIMITS } from "@money-matters/config";
import { apps } from "@money-matters/db";
import { createAssistantIntentHandler } from "./assistant-adapters.js";
import { loadTenantFormatting } from "./assistant-context.js";

const llmProvider = new CloudflareGatewayLlmProvider();

async function isAiFeatureEnabled(db: Parameters<typeof loadTenantFormatting>[0], appId: string): Promise<boolean> {
  const [appRecord] = await db
    .select({ featureFlags: apps.featureFlags })
    .from(apps)
    .where(eq(apps.id, appId))
    .limit(1);
  const flags = appRecord?.featureFlags || DEFAULT_APP_FEATURE_FLAGS;
  return Boolean(flags.aiAssistant);
}

export const assistantRouter = router({
  ask: privateTenantProcedure
    .input(AssistantAskInputSchema)
    .output(AssistantResultSchema)
    .mutation(async ({ ctx, input }) => {
      if (!(await isAiFeatureEnabled(ctx.db, ctx.appId))) {
        return { type: "unavailable", reason: "disabled" };
      }

      const sub = ctx.subscriptionStatus;
      const isExpired = Boolean(sub.isTrialExpired || sub.isDeactivated);
      if (isExpired) {
        return { type: "unavailable", reason: "subscription_required" };
      }

      const isGracePeriod = Boolean(sub.isGracePeriod || sub.isPastDue || sub.status === "PAST_DUE");
      const rateLimitCheck = await checkAiTenantRateLimit(ctx.tenantId, AI_TIER_LIMITS.free.burstPerMinute);
      if (!rateLimitCheck.allowed) {
        return { type: "unavailable", reason: "rate_limited" };
      }

      const fmt = await loadTenantFormatting(ctx.db, ctx.tenantId);
      const usageStore = new DbUsageStore(ctx.db);
      const handler = createAssistantIntentHandler(ctx.db, ctx.appId);

      return askAssistant({
        query: input.query,
        context: {
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          currency: fmt.currency,
          locale: fmt.locale,
          timezone: fmt.timezone,
        },
        appId: ctx.appId,
        isGracePeriod,
        isExpired: false,
        handler,
        llmProvider,
        usageStore,
      });
    }),

  usage: privateTenantProcedure
    .output(AssistantUsageSchema)
    .query(async ({ ctx }) => {
      const usageStore = new DbUsageStore(ctx.db);
      const [usage, featureEnabled] = await Promise.all([
        usageStore.getUsage(ctx.tenantId),
        isAiFeatureEnabled(ctx.db, ctx.appId),
      ]);

      const sub = ctx.subscriptionStatus;
      let status: "active" | "grace" | "capped" | "disabled" = "active";
      if (!featureEnabled || sub.isDeactivated || sub.isTrialExpired) {
        status = "disabled";
      } else if (sub.isGracePeriod || sub.isPastDue || sub.status === "PAST_DUE") {
        status = "grace";
      } else if (usage.remaining <= 0) {
        status = "capped";
      }

      return {
        used: usage.used,
        limit: usage.limit,
        remaining: usage.remaining,
        resetsOn: usage.resetsOn,
        plan: sub.isSubscribed ? "premium" : "free",
        status,
      };
    }),
});

export const assistantRouterMap = {
  assistantAsk: assistantRouter.ask,
  assistantUsage: assistantRouter.usage,
};
