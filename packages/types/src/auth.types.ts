import { z } from "zod";

export const SignInInputSchema = z
  .object({
    email: z.string().trim().min(1, "fillAllFields").email("invalidEmail"),
    password: z.string().min(1, "fillAllFields"),
  })
  .strict();

export const SignUpInputSchema = z
  .object({
    name: z.string().trim().min(1, "fillAllFields"),
    country: z.string().length(2, "fillAllFields"),
    email: z.string().trim().min(1, "fillAllFields").email("invalidEmail"),
    password: z.string().min(8, "passwordTooShort"),
    confirmPassword: z.string().min(8, "passwordTooShort"),
    agreedToTerms: z.literal(true, {
      errorMap: () => ({ message: "mustAgreeToTerms" }),
    }),
  })
  .strict()
  .refine((data) => data.password === data.confirmPassword, {
    message: "passwordsMustMatch",
    path: ["confirmPassword"],
  });

export const ForgotPasswordInputSchema = z
  .object({
    email: z.string().trim().min(1, "fillAllFields").email("invalidEmail"),
  })
  .strict();

export const ResetPasswordInputSchema = z
  .object({
    email: z.string().trim().min(1, "fillAllFields").email("invalidEmail"),
    otp: z.string().trim().regex(/^\d{6}$/, "invalidOtp"),
    password: z.string().min(8, "passwordTooShort"),
    confirmPassword: z.string().min(8, "passwordTooShort"),
  })
  .strict()
  .refine((data) => data.password === data.confirmPassword, {
    message: "passwordsMustMatch",
    path: ["confirmPassword"],
  });

export const OtpVerificationInputSchema = z
  .object({
    email: z.string().trim().min(1, "fillAllFields").email("invalidEmail"),
    otp: z.string().trim().regex(/^\d{6}$/, "invalidOtp"),
  })
  .strict();

export interface PasswordStrengthResult {
  score: number;
  hasMinLength: boolean;
  hasLower: boolean;
  hasUpper: boolean;
  hasNumberOrSpecial: boolean;
}

export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  const hasMinLength = password.length >= 8;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumberOrSpecial = /[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);

  const score = [hasMinLength, hasLower, hasUpper, hasNumberOrSpecial].filter(Boolean).length;

  return {
    score,
    hasMinLength,
    hasLower,
    hasUpper,
    hasNumberOrSpecial,
  };
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  if (!email) return false;
  return EMAIL_REGEX.test(email.trim());
}
