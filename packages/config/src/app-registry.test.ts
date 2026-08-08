import { describe, it, expect } from "vitest";
import { resolveAppConfig } from "./app-registry.js";

describe("App Config Registry", () => {
  it("resolves the valid application ID", () => {
    const validAppId = "01908bde-34bb-7b19-a178-574211bc93aa";
    const app = resolveAppConfig(validAppId);
    expect(app).not.toBeNull();
    expect(app?.name).toBe("Money Matters");
    expect(app?.slug).toBe("money-matters");
    expect(app?.features.canAffordCalculator).toBe(true);
    expect(app?.features.premiumEnabled).toBe(false);
  });

  it("returns null for an unregistered app ID", () => {
    const invalidAppId = "00000000-0000-0000-0000-000000000000";
    expect(resolveAppConfig(invalidAppId)).toBeNull();
  });
});
