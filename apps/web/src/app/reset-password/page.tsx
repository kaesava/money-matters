"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { t } from "@money-matters/i18n";
import { Spinner, Button } from "@money-matters/ui/web";
import { authClient } from "../../lib/auth";

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
      setError("Invalid or missing reset token. Please request a new link.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await authClient.resetPassword({
        newPassword: password,
        token,
      });

      if (res.error) {
        throw new Error(res.error.message || "Failed to reset password. The link may have expired.");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/sign-in");
      }, 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
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
        <p className="text-sm text-zinc-600">
          {t("auth.passwordResetSuccessDesc")} Redirecting to sign in...
        </p>
        <Link
          href="/sign-in"
          className="mt-2 inline-flex items-center justify-center px-4 py-2 text-xs font-bold text-white bg-[#2563eb] rounded-xl hover:bg-blue-700 transition-colors"
        >
          {t("auth.signIn")}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <div className="p-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl">
          {error}
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
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
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
          className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
        />
      </div>

      <Button
        type="submit"
        className="w-full mt-2"
        loading={isSubmitting}
        disabled={!password.trim() || !confirmPassword.trim() || password !== confirmPassword}
      >
        {t("auth.resetPasswordButton")}
      </Button>

      <div className="text-center mt-2">
        <Link href="/sign-in" className="text-xs text-[#2563eb] hover:underline font-semibold">
          ← Back to Sign In
        </Link>
      </div>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-zinc-200/80 p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-[#1B2B4B] tracking-tight">Set New Password</h1>
          <p className="text-xs text-zinc-500 mt-1">Choose a secure password for your Money Matters account.</p>
        </div>

        <Suspense fallback={<div className="flex justify-center p-8"><Spinner size="md" /></div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
