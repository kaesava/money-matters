"use client";

import React, { useState } from "react";
import Link from "next/link";
import { t } from "@money-matters/i18n";
import { Button } from "@money-matters/ui/web";
import { authClient } from "../../lib/auth";
import { trpc } from "../../lib/trpc";
import { PasswordStrengthIndicator } from "./PasswordStrengthIndicator";

interface SignUpFormProps {
  redirectUrl: string;
  onSuccess: () => void;
  onNeedOtp: (email: string, password?: string) => void;
  onError: (msg: string) => void;
  autoFocus?: boolean;
}

export function SignUpForm({
  redirectUrl,
  onSuccess,
  onNeedOtp,
  onError,
  autoFocus = true,
}: SignUpFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const createTenant = trpc.createTenant.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      onError(t("auth.fillAllFields"));
      return;
    }

    if (password.length < 8) {
      onError(t("auth.passwordTooShort"));
      return;
    }

    if (password !== confirmPassword) {
      onError(t("auth.passwordsMustMatch"));
      return;
    }

    if (!agreedToTerms) {
      onError(t("auth.mustAgreeToTerms"));
      return;
    }

    setLoading(true);

    try {
      const signUpResult = await authClient.signUp.email({
        email: email.trim().toLowerCase(),
        password,
        name: name.trim(),
      });

      if (signUpResult.error) {
        const msg = signUpResult.error.message || "Failed to create account.";
        if (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("exist")) {
          onError(t("auth.userAlreadyExists"));
        } else {
          onError(msg);
        }
        setLoading(false);
        return;
      }

      const sessionData = await authClient.getSession();
      if (sessionData.data?.session) {
        try {
          await createTenant.mutateAsync({ name: name.trim() });
        } catch (_tErr) {
          // Non-blocking on initial tenant creation
        }
        onSuccess();
        window.location.href = redirectUrl === "/dashboard" ? "/setup" : redirectUrl;
      } else {
        onNeedOtp(email.trim().toLowerCase(), password);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Failed to sign up.";
      if (errMsg.includes("Authentication required") || errMsg.includes("UNAUTHORIZED")) {
        onNeedOtp(email.trim().toLowerCase(), password);
      } else {
        onError(errMsg);
      }
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 w-full">
      <div>
        <label htmlFor="signup-name" className="block text-xs font-semibold text-slate-700 mb-1">
          {t("auth.nameLabel")}
        </label>
        <input
          id="signup-name"
          type="text"
          required
          autoFocus={autoFocus}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("auth.namePlaceholder")}
          className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
        />
      </div>

      <div>
        <label htmlFor="signup-email" className="block text-xs font-semibold text-slate-700 mb-1">
          {t("auth.emailLabel")}
        </label>
        <input
          id="signup-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("auth.emailPlaceholder")}
          className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
        />
      </div>

      <div>
        <label htmlFor="signup-password" className="block text-xs font-semibold text-slate-700 mb-1">
          {t("auth.passwordLabel")}
        </label>
        <input
          id="signup-password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t("auth.passwordPlaceholder")}
          className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
        />
        {password.length > 0 && <PasswordStrengthIndicator password={password} />}
      </div>

      <div>
        <label htmlFor="signup-confirm-password" className="block text-xs font-semibold text-slate-700 mb-1">
          {t("auth.confirmPasswordLabel")}
        </label>
        <input
          id="signup-confirm-password"
          type="password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder={t("auth.confirmPasswordPlaceholder")}
          className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
        />
      </div>

      <div className="flex items-start gap-2.5 pt-1">
        <input
          id="agree-terms-checkbox"
          type="checkbox"
          checked={agreedToTerms}
          onChange={(e) => setAgreedToTerms(e.target.checked)}
          className="mt-0.5 w-4 h-4 rounded text-[#2563eb] border-slate-300 focus:ring-[#2563eb]"
        />
        <label htmlFor="agree-terms-checkbox" className="text-[11px] text-slate-600 leading-snug">
          I agree to the{" "}
          <Link href="/terms" target="_blank" className="text-[#2563eb] hover:underline font-semibold">
            {t("landing.footerTerms")}
          </Link>{" "}
          and{" "}
          <Link href="/privacy" target="_blank" className="text-[#2563eb] hover:underline font-semibold">
            {t("landing.footerPrivacy")}
          </Link>
        </label>
      </div>

      <Button
        type="submit"
        loading={loading}
        disabled={!name.trim() || !email.trim() || !password || !confirmPassword || !agreedToTerms}
        className="w-full mt-1 bg-[#2563eb] hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-xs transition-all cursor-pointer"
      >
        {t("landing.createAccount")}
      </Button>
    </form>
  );
}
