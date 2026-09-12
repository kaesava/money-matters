"use client";

import React, { useState } from "react";
import Link from "next/link";
import { t } from "@money-matters/i18n";
import { Button } from "@money-matters/ui/web";
import { authClient } from "../../lib/auth";
import { PublicHeader } from "../../components/public/PublicHeader";
import { PublicFooter } from "../../components/public/PublicFooter";

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
        throw new Error(res.error.message || t("auth.forgotPasswordError"));
      }
      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("auth.unexpectedError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col font-sans justify-between">
      <PublicHeader backHref="/sign-in" backLabel={t("auth.backToSignIn")} />

      <main className="flex-1 flex items-center justify-center p-6 my-8">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200/80 p-8 sm:p-10">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-extrabold text-[#1B2B4B] tracking-tight">
              {t("auth.forgotPasswordTitle")}
            </h1>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              {t("auth.forgotPasswordSubtitle")}
            </p>
          </div>

          {submitted ? (
            <div className="text-center flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-[#2563eb] flex items-center justify-center font-bold text-xl">
                ✉
              </div>
              <h2 className="text-base font-bold text-[#1B2B4B]">{t("auth.checkYourEmailTitle")}</h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t("auth.checkYourEmailSubtitle", { email })}
              </p>
              <Link
                href="/sign-in"
                className="mt-2 inline-flex items-center justify-center px-5 py-2.5 text-xs font-bold text-white bg-[#2563eb] rounded-xl hover:bg-blue-700 transition-colors shadow-xs"
              >
                {t("auth.backToSignIn")}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {error && (
                <div className="p-3.5 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-xl font-semibold">
                  ⚠️ {error}
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
                loading={isSubmitting}
                disabled={!email.trim()}
              >
                {t("auth.sendResetLink")}
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
