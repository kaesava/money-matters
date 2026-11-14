import { describe, it, expect, vi } from "vitest";
import type { DbOrTx } from "@money-matters/db";
import * as dbModule from "@money-matters/db";
import { appRouter } from "./_app.js";
import { createAssistantIntentHandler } from "./assistant-adapters.js";
import type { createEdgeContext } from "../trpc/edge-context";

vi.mock("@money-matters/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@money-matters/db")>();
  return {
    ...actual,
    getEnvelopeBalancesMap: vi.fn().mockResolvedValue({ "env-everyday-1": 450, "env-goal-1": 1200 }),
  };
});

function createQueuedDb(selectResults: unknown[][]): DbOrTx {
  let idx = 0;
  const makeChain = (): Record<string, unknown> => {
    const res = () => selectResults[idx++] ?? [];
    const chain: Record<string, unknown> = {
      from: () => chain,
      where: () => chain,
      leftJoin: () => chain,
      innerJoin: () => chain,
      orderBy: () => chain,
      limit: () => Promise.resolve(res()),
      then: (resolve: (v: unknown) => void) => Promise.resolve(res()).then(resolve),
    };
    return chain;
  };
  return { select: () => makeChain() } as unknown as DbOrTx;
}

const tenantCtx = { tenantId: "t1", userId: "u1" };

describe("Assistant Router tRPC integration", () => {
  it("exposes assistantAsk and assistantUsage on the appRouter", () => {
    expect(appRouter._def.procedures.assistantAsk).toBeDefined();
    expect(appRouter._def.procedures.assistantUsage).toBeDefined();
  });

  it("rejects unauthenticated callers on assistantAsk with UNAUTHORIZED", async () => {
    const caller = appRouter.createCaller({
      req: new Request("http://localhost/trpc"),
      resHeaders: new Headers(),
      db: createQueuedDb([]) as unknown as Awaited<ReturnType<typeof createEdgeContext>>["db"],
      userId: null,
      session: null,
      email: null,
      tenantId: null,
      appId: null,
      correlationId: "corr-1",
    });
    await expect(caller.assistantAsk({ query: "Hi" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

describe("createAssistantIntentHandler", () => {
  it("returns poolNotFound instead of 0 when requested envelope does not exist", async () => {
    const db = createQueuedDb([
      [{ country: "AU", currency: "AUD", timezone: "Australia/Sydney" }],
      [
        {
          envelope: { id: "env-everyday-1", name: "Everyday", envelopeType: "EVERYDAY", isPrivate: false, userId: "u1" },
          bankAccountIsPrivate: false,
          bankAccountUserId: "u1",
        },
      ],
    ]);
    const handler = createAssistantIntentHandler(db, "app-1");
    const res = await handler.handlePoolBalance(tenantCtx, "NonExistent");
    expect(res).toEqual({
      type: "answer",
      templateKey: "assistant.answers.poolNotFound",
      templateValues: { envelopeName: "NonExistent" },
    });
  });

  it("uses goalNoTargetDate instead of a hardcoded placeholder date when endDate is null", async () => {
    const db = createQueuedDb([
      [{ country: "US", currency: "USD", timezone: "America/New_York" }],
      [
        {
          envelope: {
            id: "env-goal-1",
            name: "Holiday",
            envelopeType: "GOAL",
            targetAmount: "5000",
            endDate: null,
            isPrivate: false,
            userId: "u1",
          },
          bankAccountIsPrivate: false,
          bankAccountUserId: "u1",
        },
      ],
    ]);
    const handler = createAssistantIntentHandler(db, "app-1");
    const res = await handler.handleGoalDate(tenantCtx, "Holiday");
    expect(res).toMatchObject({
      type: "answer",
      templateKey: "assistant.answers.goalNoTargetDate",
      templateValues: { goal: "Holiday" },
    });
  });

  it("filters private envelopes out of buildSafeContext and omits PII/UUIDs", async () => {
    vi.mocked(dbModule.getEnvelopeBalancesMap).mockResolvedValue({ "env-everyday-1": 450, "env-priv": 999 });
    const db = createQueuedDb([
      [{ country: "AU", currency: "AUD", timezone: "Australia/Sydney" }],
      [
        {
          envelope: { id: "env-everyday-1", name: "Everyday", envelopeType: "EVERYDAY", isPrivate: false, userId: "u1" },
          bankAccountIsPrivate: false,
          bankAccountUserId: "u1",
        },
        {
          envelope: { id: "env-priv", name: "Partner Secret", envelopeType: "GOAL", isPrivate: true, userId: "u2" },
          bankAccountIsPrivate: false,
          bankAccountUserId: "u2",
        },
      ],
      [],
      [],
    ]);
    const handler = createAssistantIntentHandler(db, "app-1");
    const snap = await handler.buildSafeContext!(tenantCtx);
    expect(snap.envelopes.map((e) => e.name)).toEqual(["Everyday"]);
    expect(JSON.stringify(snap)).not.toContain("env-everyday-1");
    expect(JSON.stringify(snap)).not.toContain("Partner Secret");
  });

  it("returns noPendingBillsDue when no upcoming pending bills fall in window", async () => {
    const db = createQueuedDb([
      [{ country: "AU", currency: "AUD", timezone: "Australia/Sydney" }],
      [],
      [],
    ]);
    const handler = createAssistantIntentHandler(db, "app-1");
    const res = await handler.handleBillsDue(tenantCtx, 7);
    expect(res).toEqual({
      type: "answer",
      templateKey: "assistant.answers.noPendingBillsDue",
      templateValues: { days: 7 },
    });
  });

  it("resolves matching envelopeId for spending summary prefill", async () => {
    const db = createQueuedDb([
      [
        {
          envelope: { id: "env-everyday-1", name: "Groceries", envelopeType: "EVERYDAY", isPrivate: false, userId: "u1" },
          bankAccountIsPrivate: false,
          bankAccountUserId: "u1",
        },
      ],
    ]);
    const handler = createAssistantIntentHandler(db, "app-1");
    const res = await handler.handleSpendingSummary(tenantCtx, "Groceries");
    expect(res).toEqual({
      type: "prefill",
      target: "history-filter",
      params: { category: "Groceries", envelopeId: "env-everyday-1" },
    });
  });
});
