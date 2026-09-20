import { describe, it, expect } from "vitest";
import {
  SignInInputSchema,
  SignUpInputSchema,
  ForgotPasswordInputSchema,
  ResetPasswordInputSchema,
  OtpVerificationInputSchema,
  evaluatePasswordStrength,
} from "./auth.types.js";

describe("auth.types DTOs & Validation", () => {
  describe("SignInInputSchema", () => {
    it("accepts valid email and non-empty password", () => {
      const parsed = SignInInputSchema.safeParse({
        email: "user@example.com",
        password: "secretpassword",
      });
      expect(parsed.success).toBe(true);
    });

    it("rejects invalid email", () => {
      const parsed = SignInInputSchema.safeParse({
        email: "notanemail",
        password: "secretpassword",
      });
      expect(parsed.success).toBe(false);
    });

    it("rejects empty password", () => {
      const parsed = SignInInputSchema.safeParse({
        email: "user@example.com",
        password: "",
      });
      expect(parsed.success).toBe(false);
    });
  });

  describe("SignUpInputSchema", () => {
    it("accepts valid payload when passwords match and terms accepted", () => {
      const parsed = SignUpInputSchema.safeParse({
        name: "Jane Doe",
        country: "AU",
        email: "jane@example.com",
        password: "Password123!",
        confirmPassword: "Password123!",
        agreedToTerms: true,
      });
      expect(parsed.success).toBe(true);
    });

    it("rejects when password is less than 8 characters", () => {
      const parsed = SignUpInputSchema.safeParse({
        name: "Jane Doe",
        country: "AU",
        email: "jane@example.com",
        password: "Pass1",
        confirmPassword: "Pass1",
        agreedToTerms: true,
      });
      expect(parsed.success).toBe(false);
    });

    it("rejects when passwords do not match", () => {
      const parsed = SignUpInputSchema.safeParse({
        name: "Jane Doe",
        country: "AU",
        email: "jane@example.com",
        password: "Password123!",
        confirmPassword: "DifferentPassword123!",
        agreedToTerms: true,
      });
      expect(parsed.success).toBe(false);
    });

    it("rejects when agreedToTerms is not true", () => {
      const parsed = SignUpInputSchema.safeParse({
        name: "Jane Doe",
        country: "AU",
        email: "jane@example.com",
        password: "Password123!",
        confirmPassword: "Password123!",
        agreedToTerms: false,
      });
      expect(parsed.success).toBe(false);
    });
  });

  describe("ForgotPasswordInputSchema", () => {
    it("accepts valid email", () => {
      const parsed = ForgotPasswordInputSchema.safeParse({
        email: "forgot@example.com",
      });
      expect(parsed.success).toBe(true);
    });

    it("rejects invalid email", () => {
      const parsed = ForgotPasswordInputSchema.safeParse({
        email: "",
      });
      expect(parsed.success).toBe(false);
    });
  });

  describe("ResetPasswordInputSchema", () => {
    it("accepts valid token and matching 8+ char passwords", () => {
      const parsed = ResetPasswordInputSchema.safeParse({
        token: "valid-reset-token-123",
        password: "NewPassword123!",
        confirmPassword: "NewPassword123!",
      });
      expect(parsed.success).toBe(true);
    });

    it("rejects when confirmPassword differs", () => {
      const parsed = ResetPasswordInputSchema.safeParse({
        token: "valid-reset-token-123",
        password: "NewPassword123!",
        confirmPassword: "MismatchPassword123!",
      });
      expect(parsed.success).toBe(false);
    });
  });

  describe("OtpVerificationInputSchema", () => {
    it("accepts 6-digit numeric string", () => {
      const parsed = OtpVerificationInputSchema.safeParse({
        email: "verify@example.com",
        otp: "123456",
      });
      expect(parsed.success).toBe(true);
    });

    it("rejects non-6-digit or non-numeric otp", () => {
      expect(OtpVerificationInputSchema.safeParse({ email: "v@e.com", otp: "12345" }).success).toBe(false);
      expect(OtpVerificationInputSchema.safeParse({ email: "v@e.com", otp: "abcdef" }).success).toBe(false);
    });
  });

  describe("evaluatePasswordStrength", () => {
    it("scores properly based on rules", () => {
      const weak = evaluatePasswordStrength("abc");
      expect(weak.score).toBe(1); // lowercase only
      expect(weak.hasMinLength).toBe(false);

      const strong = evaluatePasswordStrength("StrongPassword123!");
      expect(strong.score).toBe(4);
      expect(strong.hasMinLength).toBe(true);
      expect(strong.hasLower).toBe(true);
      expect(strong.hasUpper).toBe(true);
      expect(strong.hasNumberOrSpecial).toBe(true);
    });
  });
});
