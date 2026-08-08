import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sendEmailViaResend, sendBudgetAlertEmail } from "./email.js";
import { logger } from "@money-matters/core";

// Mock the core logger to prevent console clutter during tests
vi.mock("@money-matters/core", () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe("Email Capability Tests", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("sendEmailViaResend", () => {
    it("simulates email sending if RESEND_API_KEY is not defined", async () => {
      delete process.env.RESEND_API_KEY;
      const result = await sendEmailViaResend({
        to: "test@example.com",
        subject: "Hello Test",
        html: "<p>Hello</p>",
      });

      expect(result.success).toBe(true);
      expect(result.simulated).toBe(true);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("RESEND_API_KEY is not defined")
      );
    });

    it("sends email successfully when API key is defined and fetch returns OK", async () => {
      process.env.RESEND_API_KEY = "re_test_key_123";
      process.env.RESEND_FROM_EMAIL = "onboarding@moneymatters.au";

      const mockJson = { id: "email-id-123" };
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockJson,
      });
      vi.stubGlobal("fetch", mockFetch);

      const result = await sendEmailViaResend({
        to: "recipient@example.com",
        subject: "Verification Needed",
        html: "<h1>Verification</h1>",
        attachments: [
          { filename: "receipt.txt", content: "Receipt Contents String" },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockJson);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.resend.com/emails",
        expect.objectContaining({
          method: "POST",
          headers: {
            Authorization: "Bearer re_test_key_123",
            "Content-Type": "application/json",
          },
          body: expect.any(String),
        })
      );

      const parsedBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(parsedBody.from).toBe("onboarding@moneymatters.au");
      expect(parsedBody.to).toEqual(["recipient@example.com"]);
      expect(parsedBody.subject).toBe("Verification Needed");
      expect(parsedBody.html).toBe("<h1>Verification</h1>");
      expect(parsedBody.attachments[0].filename).toBe("receipt.txt");
      // "Receipt Contents String" in base64 is "UmVjZWlwdCBDb250ZW50cyBTdHJpbmc="
      expect(parsedBody.attachments[0].content).toBe(
        Buffer.from("Receipt Contents String").toString("base64")
      );
    });

    it("throws an error if the Resend API response is not OK", async () => {
      process.env.RESEND_API_KEY = "re_test_key_123";

      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => "Invalid recipient format",
      });
      vi.stubGlobal("fetch", mockFetch);

      await expect(
        sendEmailViaResend({
          to: "invalid-email",
          subject: "Test",
          html: "<p>Hi</p>",
        })
      ).rejects.toThrow("Resend API returned status 400: Invalid recipient format");

      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe("sendBudgetAlertEmail", () => {
    it("correctly renders and formats the budget alert HTML template", async () => {
      process.env.RESEND_API_KEY = "re_test_key_123";
      
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: "alert-email-id" }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const details = {
        categoryName: "Groceries",
        limitAmount: "500.00",
        spentAmount: "550.50",
      };

      const result = await sendBudgetAlertEmail("user@example.com", details);
      expect(result.success).toBe(true);

      const parsedBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(parsedBody.to).toEqual(["user@example.com"]);
      expect(parsedBody.subject).toBe("[Alert] Budget Exceeded for Groceries");
      expect(parsedBody.html).toContain("Groceries");
      expect(parsedBody.html).toContain("$500.00");
      expect(parsedBody.html).toContain("$550.50");
    });
  });
});
