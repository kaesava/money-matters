"use client";

import React, { useState } from "react";
import Link from "next/link";
import { t } from "@money-matters/i18n";
import { Button } from "@money-matters/ui/web";
import { authClient } from "../../lib/auth";

interface SignInFormProps {
  redirectUrl: string;
  onSuccess: () => void;
  onNeedOtp: (email: string) => void;
  onError: (msg: string) => void;
  autoFocus?: boolean;
}

export function SignInForm({
  redirectUrl,
  onSuccess,
  onNeedOtp,
  onError,
  autoFocus = true,
}: SignInFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      onError(t("auth.fillAllFields"));
      return;
    }

    setLoading(true);

    try {
      const result = await authClient.signIn.email({
        email: email.trim().toLowerCase(),
        password,
      });

      if (result.error) {
        const errMsg = result.error.message || "";
        const errCode = (result.error as { code?: string }).code || "";
        if (errCode === "EMAIL_NOT_VERIFIED" || errMsg.toLowerCase().includes("not verified")) {
          onNeedOtp(email.trim().toLowerCase());
        } else {
          onError(result.error.message || t("auth.signInFailed"));
        }
        setLoading(false);
        return;
      }

      onSuccess();
      window.location.href = redirectUrl;
    } catch (_err) {
      onError(t("auth.unexpectedError"));
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
      <div>
        <label htmlFor="signin-email" className="block text-xs font-semibold text-slate-700 mb-1">
          {t("auth.emailLabel")}
        </label>
        <input
          id="signin-email"
          type="email"
          required
          autoFocus={autoFocus}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("auth.emailPlaceholder")}
          className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label htmlFor="signin-password" className="block text-xs font-semibold text-slate-700">
            {t("auth.passwordLabel")}
          </label>
          <Link
            href="/forgot-password"
            className="text-[11px] font-semibold text-[#2563eb] hover:underline"
          >
            {t("auth.forgotPassword")}
          </Link>
        </div>
        <input
          id="signin-password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t("auth.passwordPlaceholder")}
          className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
        />
      </div>

      <Button
        type="submit"
        loading={loading}
        disabled={!email.trim() || !password}
        className="w-full mt-1 bg-[#2563eb] hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-xs transition-all cursor-pointer"
      >
        {t("auth.signInCta")}
      </Button>
    </form>
  );
}
