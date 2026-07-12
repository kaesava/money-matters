import { describe, it, expect, vi } from "vitest";
import {
  registerDeviceTokenHandler,
  removeDeviceTokenHandler,
} from "./index.js";

vi.mock("@money-matters/db", () => {
  return {
    deviceTokens: {
      id: "device-tokens-id",
      userId: "user-id",
      tenantId: "tenant-id",
      appId: "app-id",
      platform: "platform",
      token: "token",
      createdAt: "created-at",
      createdBy: "created-by",
      updatedAt: "updated-at",
      updatedBy: "updated-by",
    },
  };
});

describe("notifications capability handlers", () => {
  const mockDb = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    returning: vi.fn().mockImplementation(() => [{ id: "mock-token-id" }]),
    then: vi.fn().mockImplementation((onFulfilled) => {
      return Promise.resolve([{ id: "mock-token-id" }]).then(onFulfilled);
    }),
  } as any;

  it("exports handlers correctly", () => {
    expect(registerDeviceTokenHandler).toBeDefined();
    expect(removeDeviceTokenHandler).toBeDefined();
  });

  it("can register device token", async () => {
    const registerHandler = registerDeviceTokenHandler(mockDb);
    const result = await registerHandler(
      { platform: "ios", token: "token-value" },
      "tenant-123",
      "app-123",
      "user-123"
    );
    expect(mockDb.select).toHaveBeenCalled();
    expect(result).toHaveProperty("id");
  });
});
