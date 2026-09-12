"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { t } from "@money-matters/i18n";
import { Spinner, Button } from "@money-matters/ui/web";
import { authClient } from "../../lib/auth";
import { PublicHeader } from "../../components/public/PublicHeader";
import { PublicFooter } from "../../components/public/PublicFooter";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError(t("auth.tokenMissingError"));
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
        throw new Error(res.error.message || t("auth.invalidToken"));
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/sign-in");
      }, 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("auth.unexpectedError"));
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

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <div className="p-3.5 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-xl font-semibold">
          ⚠️ {error}
        </div>
      )}

      <div>
        <label htmlFor="new-password-input" className="block text-xs font-semibold text-[#1B2B4B] mb-1">
          {t("auth.newPasswordLabel")}
        </label>
        <input
          id="new-password-input"
          type="password"
          required
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
        />
      </div>

      <div>
        <label htmlFor="confirm-password-input" className="block text-xs font-semibold text-[#1B2B4B] mb-1">
          {t("auth.confirmPasswordLabel")}
        </label>
        <input
          id="confirm-password-input"
          type="password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
        />
      </div>

      <Button
        type="submit"
        className="w-full mt-2 bg-[#2563eb] hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-xs cursor-pointer"
        loading={isSubmitting}
        disabled={!password.trim() || !confirmPassword.trim() || password !== confirmPassword}
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
