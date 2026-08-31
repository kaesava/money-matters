"use client";

import React, { useState } from "react";
import Link from "next/link";
import { t } from "@money-matters/i18n";
import { Button } from "@money-matters/ui/web";
import { authClient } from "../../lib/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await authClient.requestPasswordReset({
        email,
        redirectTo: window.location.origin + "/reset-password",
      });
      if (res.error) {
        throw new Error(res.error.message || "Failed to send password reset email.");
      }
      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-zinc-200/80 p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-[#1B2B4B] tracking-tight">Reset Your Password</h1>
          <p className="text-xs text-zinc-500 mt-1">Enter your email address to receive a password reset link.</p>
        </div>

        {submitted ? (
          <div className="text-center flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-[#2563eb] flex items-center justify-center font-bold text-xl">
              ✉
            </div>
            <h2 className="text-base font-bold text-[#1B2B4B]">Check Your Email</h2>
            <p className="text-xs text-zinc-600">
              We&apos;ve sent a password reset link to <strong className="text-zinc-800">{email}</strong> if an account exists under that address.
            </p>
            <Link
              href="/sign-in"
              className="mt-2 inline-flex items-center justify-center px-4 py-2 text-xs font-bold text-white bg-[#2563eb] rounded-xl hover:bg-blue-700 transition-colors"
            >
              Back to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div className="p-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email-input" className="block text-xs font-semibold text-[#1B2B4B] mb-1">
                {t("auth.emailLabel")}
              </label>
              <input
                id="email-input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
              />
            </div>

            <Button
              type="submit"
              className="w-full mt-2"
              loading={isSubmitting}
              disabled={!email.trim()}
            >
              Send Reset Link
            </Button>

            <div className="text-center mt-2">
              <Link href="/sign-in" className="text-xs text-[#2563eb] hover:underline font-semibold">
                ← Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
