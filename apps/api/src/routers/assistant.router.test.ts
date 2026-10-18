import { describe, it, expect, vi } from "vitest";
import { appRouter } from "./_app.js";

describe("Assistant Router tRPC integration", () => {
  it("exposes assistantAsk and assistantUsage on the appRouter", () => {
    expect(appRouter._def.procedures.assistantAsk).toBeDefined();
    expect(appRouter._def.procedures.assistantUsage).toBeDefined();
  });
});
