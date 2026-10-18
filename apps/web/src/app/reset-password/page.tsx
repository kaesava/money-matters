"use client";

import React, { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { t } from "@money-matters/i18n";
import {
  Button,
  FormLabel,
  FormFieldError,
  FormErrorBanner,
} from "@money-matters/ui/web";
import { authClient } from "../../lib/auth";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError(t("auth.invalidToken"));
      return;
    }

    if (password.length < 8) {
      setError(t("auth.passwordTooShort"));
      return;
    }

    if (password !== confirmPassword) {
      setError(t("auth.passwordsMustMatch"));
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await authClient.resetPassword({
        newPassword: password,
        token,
      });

      if (res.error) {
        throw new Error(res.error.message || t("auth.resetPasswordGenericError"));
      }

      setIsSuccess(true);
      setTimeout(() => {
        router.push("/sign-in");
      }, 2500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("auth.resetPasswordGenericError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid =
    token.length > 0 &&
    password.length >= 8 &&
    confirmPassword.length >= 8 &&
    password === confirmPassword;

  if (isSuccess) {
    return (
      <div className="text-center py-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          {t("auth.passwordResetSuccessTitle")}
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {t("auth.passwordResetSuccessDesc")}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && <FormErrorBanner message={error} />}

      {!token && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-xs rounded-lg">
          {t("auth.invalidToken")}
        </div>
      )}

      <div>
        <FormLabel required>{t("auth.newPasswordLabel")}</FormLabel>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t("auth.confirmPasswordPlaceholder")}
          autoFocus
          disabled={!token || isSubmitting}
          className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {password.length > 0 && password.length < 8 && (
          <FormFieldError error={t("auth.passwordTooShort")} />
        )}
      </div>

      <div>
        <FormLabel required>{t("auth.confirmPasswordLabel")}</FormLabel>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder={t("auth.confirmPasswordPlaceholder")}
          disabled={!token || isSubmitting}
          className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {confirmPassword.length > 0 && password !== confirmPassword && (
          <FormFieldError error={t("auth.passwordsMustMatch")} />
        )}
      </div>

      <Button
        type="submit"
        variant="primary"
        disabled={!isFormValid || isSubmitting}
        loading={isSubmitting}
        className="w-full mt-2"
      >
        {t("auth.resetPasswordButton")}
      </Button>

      <div className="text-center mt-4">
        <Link
          href="/sign-in"
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          {t("auth.signInInstead")}
        </Link>
      </div>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
      <div className="w-full max-w-md p-8 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t("auth.resetPassword")}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {t("auth.resetPasswordSubtitle")}
          </p>
        </div>
        <Suspense fallback={<div className="h-48 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-lg" />}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
