import { describe, it, expect, vi, beforeEach } from "vitest";
import { submitFeedbackCommand, escapeHtml } from "./submit-feedback.command.js";
import * as core from "@money-matters/core";

vi.mock("@money-matters/core", async () => {
  const actual = await vi.importActual<typeof core>("@money-matters/core");
  return {
    ...actual,
    sendEmail: vi.fn().mockResolvedValue({ success: true, id: "msg-123" }),
    checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 4 }),
  };
});

describe("submitFeedbackCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("escapes HTML characters safely", () => {
    expect(escapeHtml("<script>alert('xss')</script>")).toBe(
      "&lt;script&gt;alert(&#039;xss&#039;)&lt;/script&gt;"
    );
    expect(escapeHtml('Foo & Bar "Baz"')).toBe("Foo &amp; Bar &quot;Baz&quot;");
  });

  it("dispatches feedback email with sanitized HTML and diagnostics", async () => {
    const result = await submitFeedbackCommand(
      {
        category: "ui_ux",
        severity: "LOW",
        title: "Button alignment issue",
        description: "The button is misaligned on mobile screen",
        email: "test@example.com",
        appVersion: "1.0.0",
        route: "/dashboard",
      },
      {
        userId: "user-123",
        tenantId: "tenant-456",
        userEmail: "test@example.com",
      }
    );

    expect(result.success).toBe(true);
    expect(result.messageId).toBe("msg-123");
    expect(core.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "info@moneymatters.kaesava.au",
        subject: "[Feedback] [LOW] Button alignment issue",
      })
    );
  });

  it("enforces rate limit when user exceeds limit", async () => {
    vi.mocked(core.checkRateLimit).mockResolvedValueOnce({
      allowed: false,
      remaining: 0,
    });

    await expect(
      submitFeedbackCommand(
        {
          category: "ui_ux",
          severity: "HIGH",
          title: "Too many submissions",
          description: "Trying to submit too quickly",
        },
        { userId: "user-spammer" }
      )
    ).rejects.toThrow("Rate limit exceeded");
  });

  it("rejects invalid inputs violating schema", async () => {
    await expect(
      submitFeedbackCommand(
        {
          category: "ui_ux",
          severity: "LOW",
          title: "", // empty title
          description: "Something",
        },
        { userId: "user-1" }
      )
    ).rejects.toThrow();
  });
});
