import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sendEmail, sendNotificationEmail, escapeHtml, redactEmail } from "./email.js";

describe("email service", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("escapes HTML entities safely", () => {
    expect(escapeHtml("<b>Bold</b> & 'Special' \"Quotes\"")).toBe(
      "&lt;b&gt;Bold&lt;/b&gt; &amp; &#039;Special&#039; &quot;Quotes&quot;"
    );
  });

  it("redacts email addresses for safe logging", () => {
    expect(redactEmail("user@example.com")).toBe("u***r@example.com");
    expect(redactEmail("ab@test.au")).toBe("a***@test.au");
    expect(redactEmail("invalid")).toBe("[REDACTED_EMAIL]");
  });

  it("simulates email dispatch in development when RESEND_API_KEY is not configured", async () => {
    delete process.env["RESEND_API_KEY"];
    delete process.env["ENVIRONMENT"];
    process.env["NODE_ENV"] = "development";

    const result = await sendEmail({
      to: "test@example.com",
      subject: "Test Subject",
      html: "<p>Hello</p>",
    });

    expect(result.success).toBe(true);
    expect(result.id).toBe("simulated-dev-email-id");
  });

  it("throws error in production when RESEND_API_KEY is missing (fail-closed)", async () => {
    delete process.env["RESEND_API_KEY"];
    process.env["ENVIRONMENT"] = "production";

    await expect(
      sendEmail({
        to: "test@example.com",
        subject: "Production Alert",
        html: "<p>Hello</p>",
      })
    ).rejects.toThrow("RESEND_API_KEY is not configured in production");
  });

  it("dispatches email via Resend API when RESEND_API_KEY is present", async () => {
    process.env["RESEND_API_KEY"] = "re_test_key";

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ id: "resend-msg-123" }),
    });
    globalThis.fetch = mockFetch;

    const result = await sendEmail({
      to: "recipient@example.com",
      subject: "Important update",
      html: "<p>Content</p>",
    });

    expect(result.success).toBe(true);
    expect(result.id).toBe("resend-msg-123");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("escapes body text in sendNotificationEmail", async () => {
    process.env["RESEND_API_KEY"] = "re_test_key";

    let passedBody = "";
    globalThis.fetch = vi.fn().mockImplementation(async (_url, opts) => {
      passedBody = opts.body;
      return {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ id: "notif-1" }),
      };
    });

    const result = await sendNotificationEmail(
      "user@example.com",
      "Notification",
      "<script>alert('bad')</script>\nLine 2"
    );

    expect(result.success).toBe(true);
    expect(passedBody).toContain("&lt;script&gt;alert(&#039;bad&#039;)&lt;/script&gt;<br />Line 2");
  });
});
