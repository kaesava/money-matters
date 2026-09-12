"use client";

import React, { useState } from "react";
import { t } from "@money-matters/i18n";
import { Button, Spinner } from "@money-matters/ui/web";
import { authClient } from "../../lib/auth";

interface OtpVerificationViewProps {
  email: string;
  onSuccess: () => void;
  onCancel?: () => void;
  password?: string;
}

export function OtpVerificationView({
  email,
  onSuccess,
  onCancel,
  password,
}: OtpVerificationViewProps) {
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length < 6) {
      setError(t("auth.invalidOtp"));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await authClient.emailOtp.verifyEmail({
        email: email.trim().toLowerCase(),
        otp: otpCode.trim(),
      });

      if (res.error) {
        setError(res.error.message || t("auth.invalidOtp"));
        setLoading(false);
        return;
      }

      if (password) {
        await authClient.signIn.email({
          email: email.trim().toLowerCase(),
          password,
        });
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.invalidOtp"));
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError(null);
    setResendSuccess(false);
    try {
      await authClient.emailOtp.sendVerificationOtp({
        email: email.trim().toLowerCase(),
        type: "email-verification",
      });
      setResendSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend code.");
    } finally {
      setResending(false);
    }
  };

  return (
    <form onSubmit={handleVerify} className="flex flex-col gap-4 w-full">
      <div className="text-center space-y-1">
        <h2 className="text-base font-bold text-[#1B2B4B]">{t("auth.checkYourEmailTitle")}</h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          {t("auth.verificationSentMessage")} <strong className="text-slate-800">{email}</strong>.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl">
          ⚠️ {error}
        </div>
      )}

      {resendSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl">
          ✓ {t("auth.resendSuccess")}
        </div>
      )}

      <div>
        <label htmlFor="otp-input" className="block text-xs font-semibold text-slate-700 mb-1">
          {t("auth.otpLabel")}
        </label>
        <input
          id="otp-input"
          type="text"
          maxLength={6}
          autoFocus
          value={otpCode}
          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
          placeholder={t("auth.otpPlaceholder")}
          className="w-full text-center tracking-widest text-lg font-mono px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
        />
      </div>

      <Button type="submit" loading={loading} disabled={otpCode.length < 6} className="w-full">
        {t("auth.verifyCodeCta")}
      </Button>

      <div className="flex items-center justify-between text-xs pt-2">
        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="text-[#2563eb] hover:underline font-semibold cursor-pointer disabled:opacity-50 flex items-center gap-1"
        >
          {resending && <Spinner size="sm" />}
          <span>{t("auth.resendVerificationLink")}</span>
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-slate-500 hover:text-slate-700 font-semibold cursor-pointer"
          >
            {t("common.cancel")}
          </button>
        )}
      </div>
    </form>
  );
}
