import { describe, it, expect, vi } from "vitest";
import { createBugReportHandler } from "./index.js";

describe("createBugReportHandler", () => {
  it("should successfully insert a bug report into the database with tenant scoping", async () => {
    const mockCreated = {
      id: "bug-uuid-1234",
      status: "open",
      createdAt: new Date("2026-08-23T02:50:00Z"),
    };

    const mockDb = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockCreated]),
        }),
      }),
    };

    const handler = createBugReportHandler(mockDb as any);

    const result = await handler(
      {
        title: "Calculation discrepancy on bills pile",
        description: "Expected $100 allocation but target showed $80.",
        category: "budgeting",
        severity: "high",
        platform: "web",
        appVersion: "1.0.0-beta",
        pageUrl: "/dashboard/settings",
        deviceInfo: "Mozilla/5.0 (X11; Linux x86_64)",
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
  });
});
