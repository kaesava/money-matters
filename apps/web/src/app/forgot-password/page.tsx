"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { t } from "@money-matters/i18n";
import {
  Button,
  FormLabel,
  FormFieldError,
  FormErrorBanner,
  OtpInput,
  Spinner,
} from "@money-matters/ui/web";
import { isValidEmail, ResetPasswordInputSchema } from "@money-matters/types";
import { authClient } from "../../lib/auth";
import { PublicHeader } from "../../components/public/PublicHeader";
import { PublicFooter } from "../../components/public/PublicFooter";
import { PasswordStrengthIndicator } from "../../components/auth/PasswordStrengthIndicator";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [step, setStep] = useState<"email" | "reset" | "success">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isRequestingCode, setIsRequestingCode] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    otp?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(email)) return;

    setError(null);
    setIsRequestingCode(true);

    try {
      await authClient.emailOtp.requestPasswordReset({
        email: email.trim().toLowerCase(),
      });
      setStep("reset");
    } catch (_err) {
      // Quiet UX to prevent user enumeration
      setStep("reset");
    } finally {
      setIsRequestingCode(false);
    }
  };

  const handleResendCode = async () => {
    setIsResending(true);
    setError(null);
    setResendSuccess(false);

    try {
      await authClient.emailOtp.requestPasswordReset({
        email: email.trim().toLowerCase(),
      });
      setResendSuccess(true);
    } catch (_err) {
      setResendSuccess(true);
    } finally {
      setIsResending(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const validation = ResetPasswordInputSchema.safeParse({
      email: email.trim().toLowerCase(),
      otp: otp.trim(),
      password,
      confirmPassword,
    });

    if (!validation.success) {
      const formatted = validation.error.format();
      setFieldErrors({
        otp: formatted.otp?._errors[0] ? t("auth.invalidOtpError") : undefined,
        password: formatted.password?._errors[0] ? t("auth.passwordTooShort") : undefined,
        confirmPassword: formatted.confirmPassword?._errors[0]
          ? (formatted.confirmPassword._errors[0] === "passwordsMustMatch"
              ? t("auth.passwordsMustMatch")
              : t("auth.passwordTooShort"))
          : undefined,
      });
      return;
    }

    setIsResetting(true);
    try {
      const res = await authClient.emailOtp.resetPassword({
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
        password,
      });

      if (res.error) {
        throw new Error(res.error.message || t("auth.invalidOtpError"));
      }

      setStep("success");
      setTimeout(() => {
        router.push("/sign-in");
      }, 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("auth.invalidOtpError"));
    } finally {
      setIsResetting(false);
    }
  };

  const isResetValid =
    otp.length === 6 &&
    password.length >= 8 &&
    confirmPassword.length >= 8 &&
    password === confirmPassword;

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col font-sans justify-between">
      <PublicHeader backHref="/sign-in" backLabel={t("auth.backToSignIn")} />

      <main className="flex-1 flex items-center justify-center p-6 my-8">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200/80 p-8 sm:p-10">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-extrabold text-[#1B2B4B] tracking-tight">
              {step === "reset" ? t("auth.setNewPasswordTitle") : t("auth.forgotPasswordTitle")}
            </h1>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              {step === "reset"
                ? t("auth.setNewPasswordSubtitle")
                : t("auth.forgotPasswordSubtitle")}
            </p>
          </div>

          {step === "success" && (
            <div className="text-center flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xl">
                ✓
              </div>
              <h2 className="text-base font-bold text-[#1B2B4B]">
                {t("auth.passwordResetSuccessTitle")}
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t("auth.passwordResetSuccessDesc")}
              </p>
              <Link
                href="/sign-in"
                className="mt-2 inline-flex items-center justify-center px-5 py-2.5 text-xs font-bold text-white bg-[#2563eb] rounded-xl hover:bg-blue-700 transition-colors shadow-xs"
              >
                {t("auth.backToSignIn")}
              </Link>
            </div>
          )}

          {step === "email" && (
            <form onSubmit={handleRequestCode} className="flex flex-col gap-4">
              <FormErrorBanner message={error} />

              <div>
                <FormLabel htmlFor="email-input" required={true}>
                  {t("auth.emailLabel")}
                </FormLabel>
                <input
                  id="email-input"
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("auth.emailPlaceholder")}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                />
              </div>

              <Button
                type="submit"
                className="w-full mt-2 bg-[#2563eb] hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-xs cursor-pointer"
                loading={isRequestingCode}
                disabled={!isValidEmail(email) || isRequestingCode}
              >
                {t("auth.sendResetCode")}
              </Button>

              <div className="text-center mt-2">
                <Link href="/sign-in" className="text-xs text-[#2563eb] hover:underline font-semibold">
                  {t("auth.backToSignIn")}
                </Link>
              </div>
            </form>
          )}

          {step === "reset" && (
            <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
              <FormErrorBanner message={error} />

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div className="truncate mr-2">
                  <span className="text-[11px] text-slate-500 block font-medium">
                    {t("auth.codeSentTo")}
                  </span>
                  <span className="text-xs font-bold text-slate-800 truncate block">
                    {email}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setOtp("");
                  }}
                  className="text-xs text-[#2563eb] hover:underline font-semibold shrink-0 cursor-pointer"
                >
                  {t("auth.editEmail")}
                </button>
              </div>

              {resendSuccess && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl text-center">
                  ✓ {t("auth.resendSuccess")}
                </div>
              )}

              <div>
                <OtpInput
                  id="otp-input"
                  label={t("auth.otpLabel")}
                  required={true}
                  autoFocus={true}
                  value={otp}
                  onChange={(val) => {
                    setOtp(val);
                    if (fieldErrors.otp) setFieldErrors((prev) => ({ ...prev, otp: undefined }));
                  }}
                  placeholder={t("auth.otpPlaceholder")}
                  error={fieldErrors.otp}
                />
                <div className="flex justify-end mt-1">
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={isResending}
                    className="text-xs text-[#2563eb] hover:underline font-semibold cursor-pointer disabled:opacity-50 inline-flex items-center gap-1"
                  >
                    {isResending && <Spinner size="sm" />}
                    <span>{t("auth.resendCode")}</span>
                  </button>
                </div>
              </div>

              <div>
                <FormLabel htmlFor="new-password-input" required={true}>
                  {t("auth.newPasswordLabel")}
                </FormLabel>
                <input
                  id="new-password-input"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  placeholder="••••••••"
                  className={`w-full px-3.5 py-2.5 text-sm rounded-xl border ${
                    fieldErrors.password ? "border-rose-400 focus:ring-rose-500" : "border-slate-200 focus:ring-[#2563eb]"
                  } focus:outline-none focus:ring-2`}
                />
                <FormFieldError error={fieldErrors.password} />
                {password && <PasswordStrengthIndicator password={password} />}
              </div>

              <div>
                <FormLabel htmlFor="confirm-password-input" required={true}>
                  {t("auth.confirmPasswordLabel")}
                </FormLabel>
                <input
                  id="confirm-password-input"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (fieldErrors.confirmPassword) setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                  }}
                  placeholder="••••••••"
                  className={`w-full px-3.5 py-2.5 text-sm rounded-xl border ${
                    fieldErrors.confirmPassword ? "border-rose-400 focus:ring-rose-500" : "border-slate-200 focus:ring-[#2563eb]"
                  } focus:outline-none focus:ring-2`}
                />
                <FormFieldError error={fieldErrors.confirmPassword} />
              </div>

              <Button
                type="submit"
                className="w-full mt-2 bg-[#2563eb] hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-xs cursor-pointer"
                loading={isResetting}
                disabled={!isResetValid || isResetting}
              >
                {t("auth.resetPasswordButton")}
              </Button>

              <div className="text-center mt-2">
                <Link href="/sign-in" className="text-xs text-[#2563eb] hover:underline font-semibold">
                  {t("auth.backToSignIn")}
                </Link>
              </div>
            </form>
          )}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
