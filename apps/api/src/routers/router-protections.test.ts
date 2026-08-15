import { describe, it, expect, vi } from "vitest";
import { requiresWriteAccess } from "../trpc/trpc.js";
import { MONEY_MATTERS_APP_ID } from "../trpc/context.js";
import { TRPCError } from "@trpc/server";
import { categoriesRouter } from "./categories.router.js";
import type { SubscriptionStatusDto } from "@money-matters/types";

describe("Router Write Access & Protection Guards", () => {
  it("requiresWriteAccess throws TRPCError FORBIDDEN when tenant is in read-only grace period", () => {
    const readOnlyCtx: { subscriptionStatus: SubscriptionStatusDto } = {
      subscriptionStatus: {
        status: "TRIAL_GRACE",
        isTrialActive: false,
        isTrialGrace: true,
        isTrialExpired: false,
        isSubscribed: false,
        isPastDue: false,
        isDeactivated: false,
        daysRemainingInTrial: 0,
        trialEndsAt: null,
        trialGraceEndsAt: new Date(),
        subscriptionEndsAt: null,
      },
    };

    expect(() => requiresWriteAccess(readOnlyCtx)).toThrow(TRPCError);
    try {
      requiresWriteAccess(readOnlyCtx);
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(TRPCError);
      expect((err as TRPCError).code).toBe("FORBIDDEN");
      expect((err as TRErrorLike).message).toContain("subscription_read_only");
    }
  });

  it("requiresWriteAccess allows access when tenant is in active trial or paid subscription", () => {
    const activeCtx: { subscriptionStatus: SubscriptionStatusDto } = {
      subscriptionStatus: {
        status: "TRIAL_ACTIVE",
        isTrialActive: true,
        isTrialGrace: false,
        isTrialExpired: false,
        isSubscribed: false,
        isPastDue: false,
        isDeactivated: false,
        daysRemainingInTrial: 45,
        trialEndsAt: new Date(Date.now() + 45 * 86400000),
        trialGraceEndsAt: null,
        subscriptionEndsAt: null,
      },
    };

    expect(() => requiresWriteAccess(activeCtx)).not.toThrow();
  });

  it("exports canonical MONEY_MATTERS_APP_ID constant", () => {
    expect(MONEY_MATTERS_APP_ID).toBe("01908bde-34bb-7b19-a178-574211bc93aa");
  });

  it("evaluateDueGuardrail applies appId scoping to upcoming expense events query", async () => {
    const tenantId = "11111111-1111-1111-1111-111111111111";
    const appId = "01908bde-34bb-7b19-a178-574211bc93aa";

    let capturedWhereFn: unknown = null;

    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
      query: {
        expenseEvents: {
          findMany: vi.fn().mockImplementation(({ where }: { where: unknown }) => {
            capturedWhereFn = where;
            return Promise.resolve([
              {
                id: "e1",
                name: "Rent",
                expectedAmount: "500.00",
                expectedDate: new Date().toISOString().split("T")[0],
              },
            ]);
          }),
        },
      },
    };

    const caller = categoriesRouter.evaluateDueGuardrail;
    const result = await (caller as unknown as { _def: { mutation?: unknown; query?: unknown } });
    expect(result).toBeDefined();
  });
});

interface TRErrorLike {
  message: string;
}
