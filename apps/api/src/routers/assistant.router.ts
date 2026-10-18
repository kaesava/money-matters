import { TRPCError } from "@trpc/server";
import { router, privateTenantProcedure, tenantProcedure } from "../trpc/trpc.js";
import {
  AssistantAskInputSchema,
  AssistantResultSchema,
  AssistantUsageSchema,
} from "@money-matters/types";
import {
  askAssistant,
  DbUsageStore,
  CloudflareGatewayLlmProvider,
} from "@money-matters/capability-assistant";
import { checkAiTenantRateLimit } from "@money-matters/core";
import { AI_TIER_LIMITS } from "@money-matters/config";
import { createAssistantIntentHandler } from "./assistant-adapters.js";

const llmProvider = new CloudflareGatewayLlmProvider();

export const assistantRouter = router({
  ask: privateTenantProcedure
    .input(AssistantAskInputSchema)
    .output(AssistantResultSchema)
    .mutation(async ({ ctx, input }) => {
      // 1. Sliding window burst limit check (fail closed if active)
      const burstLimit = AI_TIER_LIMITS.free.burstPerMinute;
      const rateLimitCheck = await checkAiTenantRateLimit(ctx.tenantId, burstLimit);
      if (!rateLimitCheck.allowed) {
        return {
          type: "unavailable",
          reason: "rate_limited",
        };
      }

      // 2. Wire usage store and domain adapter
      const usageStore = new DbUsageStore(ctx.db);
      const handler = createAssistantIntentHandler(ctx.db, ctx.appId);

      const isGracePeriod = ctx.subscriptionStatus.status === "TRIAL_GRACE";
      const isExpired = ctx.subscriptionStatus.isDeactivated;

      // 3. Ask assistant orchestration
      return askAssistant({
        query: input.query,
        context: {
          tenantId: ctx.tenantId,
          userId: ctx.userId,
        },
        appId: ctx.appId,
        isGracePeriod,
        isExpired,
        handler,
        llmProvider,
        usageStore,
      });
    }),

  usage: tenantProcedure
    .output(AssistantUsageSchema)
    .query(async ({ ctx }) => {
      const usageStore = new DbUsageStore(ctx.db);
      const usage = await usageStore.getUsage(ctx.tenantId);

      let status: "active" | "grace" | "capped" | "disabled" = "active";
      if (ctx.subscriptionStatus.isDeactivated) {
        status = "disabled";
      } else if (ctx.subscriptionStatus.status === "TRIAL_GRACE") {
        status = "grace";
      } else if (usage.remaining <= 0) {
        status = "capped";
      }

      return {
        used: usage.used,
        limit: usage.limit,
        remaining: usage.remaining,
        resetsOn: usage.resetsOn,
        plan: "free",
        status,
      };
    }),
});

export const assistantRouterMap = {
  assistantAsk: assistantRouter.ask,
  assistantUsage: assistantRouter.usage,
};
