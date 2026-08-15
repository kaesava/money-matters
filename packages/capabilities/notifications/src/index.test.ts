import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { DbOrTx } from "@money-matters/db";
import {
  registerDeviceTokenHandler,
  removeDeviceTokenHandler,
  sendEmailViaResend,
  sendBudgetAlertEmail,
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
  } as unknown as DbOrTx;

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

  it("exports createScheduledNotificationFunctions", async () => {
    const { createScheduledNotificationFunctions } = await import("./index.js");
    expect(createScheduledNotificationFunctions).toBeDefined();
  });
});

describe("Resend email sending helper", () => {
  const originalEnv = process.env.RESEND_API_KEY;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env.RESEND_API_KEY = originalEnv;
  });

  it("simulates email send if RESEND_API_KEY is not defined", async () => {
    delete process.env.RESEND_API_KEY;
    const res = await sendEmailViaResend({
      to: "user@example.com",
      subject: "Test Subject",
      html: "<p>Test Content</p>",
    });
    expect(res).toEqual({ success: true, simulated: true });
  });

  it("calls fetch API with correct endpoint, headers and payload when key present", async () => {
    process.env.RESEND_API_KEY = "re_test123";
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "msg_123" }),
    } as Response);

    const res = await sendEmailViaResend({
      to: "user@example.com",
      subject: "Budget Alert",
      html: "<h1>Alert</h1>",
    });

    expect(fetchSpy).toHaveBeenCalledWith("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer re_test123",
        "Content-Type": "application/json",
      },
      body: expect.stringContaining("Budget Alert"),
    });
    expect(res).toEqual({ success: true, data: { id: "msg_123" } });
  });
});

describe("sendBudgetAlertEmail template generator", () => {
  it("renders budget alert email HTML and calls sendEmailViaResend", async () => {
    delete process.env.RESEND_API_KEY; // keep simulated
    const res = await sendBudgetAlertEmail("test@example.com", {
      categoryName: "Groceries",
      limitAmount: "500.00",
      spentAmount: "450.00",
      householdName: "Kaesan Household",
    });

    expect(res).toEqual({ success: true, simulated: true });
  });
});
