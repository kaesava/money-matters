"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { t } from "@money-matters/i18n";
import { Spinner, Button, FormLabel, FormFieldError, FormErrorBanner } from "@money-matters/ui/web";
import { ResetPasswordInputSchema } from "@money-matters/types";
import { PasswordStrengthIndicator } from "../../components/auth/PasswordStrengthIndicator";
import { authClient } from "../../lib/auth";
import { PublicHeader } from "../../components/public/PublicHeader";
import { PublicFooter } from "../../components/public/PublicFooter";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    if (!token) {
      setError(t("auth.linkExpiredError"));
      return;
    }

    const validation = ResetPasswordInputSchema.safeParse({
      token,
      password,
      confirmPassword,
    });

    if (!validation.success) {
      const formatted = validation.error.format();
      setFieldErrors({
        password: formatted.password?._errors[0],
        confirmPassword: formatted.confirmPassword?._errors[0],
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await authClient.resetPassword({
        newPassword: password,
        token,
      });

      if (res.error) {
        throw new Error(res.error.message || t("auth.linkExpiredError"));
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/sign-in");
      }, 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("auth.linkExpiredError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="text-center flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xl">
          ✓
        </div>
        <h2 className="text-xl font-bold text-[#1B2B4B]">{t("auth.passwordResetSuccessTitle")}</h2>
        <p className="text-sm text-slate-600">
          {t("auth.passwordResetSuccessDesc")}
        </p>
        <Link
          href="/sign-in"
          className="mt-2 inline-flex items-center justify-center px-5 py-2.5 text-xs font-bold text-white bg-[#2563eb] rounded-xl hover:bg-blue-700 transition-colors shadow-xs"
        >
          {t("auth.signIn")}
        </Link>
      </div>
    );
  }

  const isFormValid =
    token &&
    password.length >= 8 &&
    confirmPassword.length >= 8 &&
    password === confirmPassword;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FormErrorBanner message={error} />

      <div>
        <FormLabel htmlFor="new-password-input" required={true}>
          {t("auth.newPasswordLabel")}
        </FormLabel>
        <input
          id="new-password-input"
          type="password"
          required
          autoFocus
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
        loading={isSubmitting}
        disabled={!isFormValid || isSubmitting}
      >
        {t("auth.resetPasswordButton")}
      </Button>

      <div className="text-center mt-2">
        <Link href="/sign-in" className="text-xs text-[#2563eb] hover:underline font-semibold">
          {t("auth.backToSignIn")}
        </Link>
      </div>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col font-sans justify-between">
      <PublicHeader backHref="/sign-in" backLabel={t("auth.backToSignIn")} />

      <main className="flex-1 flex items-center justify-center p-6 my-8">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200/80 p-8 sm:p-10">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-extrabold text-[#1B2B4B] tracking-tight">
              {t("auth.setNewPasswordTitle")}
            </h1>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              {t("auth.setNewPasswordSubtitle")}
            </p>
          </div>

          <Suspense
            fallback={
              <div className="flex justify-center p-8">
                <Spinner size="lg" className="text-[#2563eb]" />
              </div>
            }
          >
            <ResetPasswordForm />
          </Suspense>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
