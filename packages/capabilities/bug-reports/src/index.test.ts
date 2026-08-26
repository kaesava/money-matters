import { describe, it, expect, vi } from "vitest";
import { createBugReportHandler } from "./index.js";
import type { DbOrTx } from "@money-matters/db";

describe("createBugReportHandler", () => {
  it("should successfully insert a bug report into the database with tenant scoping and frustration level", async () => {
    const mockCreated = {
      id: "bug-uuid-1234",
      status: "open",
      createdAt: new Date("2026-08-26T11:00:00Z"),
    };

    const mockValues = vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([mockCreated]),
    });

    const mockDb = {
      insert: vi.fn().mockReturnValue({
        values: mockValues,
      }),
    };

    const handler = createBugReportHandler(mockDb as unknown as DbOrTx);

    const result = await handler(
      {
        title: "Calculation discrepancy on bills pile",
        description: "Expected $100 allocation but target showed $80.",
        category: "waterfall",
        frustrationLevel: 3,
        contactConsent: true,
        userEmail: "user@example.com",
        platform: "web",
        appVersion: "1.0.0-beta",
        pageUrl: "/dashboard/settings",
        deviceInfo: "Chrome 128 on macOS 14.5",
      },
      "tenant-uuid-5678",
      "app-uuid-9012",
      "user-uuid-3456"
    );

    expect(result).toEqual({
      id: "bug-uuid-1234",
      status: "open",
      createdAt: mockCreated.createdAt,
    });

    expect(mockDb.insert).toHaveBeenCalledTimes(1);
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Calculation discrepancy on bills pile",
        category: "waterfall",
        severity: "high",
        frustrationLevel: 3,
        contactConsent: true,
        tenantId: "tenant-uuid-5678",
        appId: "app-uuid-9012",
        createdBy: "user-uuid-3456",
      })
    );
  });
});
