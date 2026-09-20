"use client";

import React, { useState, useEffect } from "react";
import { t } from "@money-matters/i18n";
import { Logo, FormErrorBanner } from "@money-matters/ui/web";
import { SignInForm } from "../auth/SignInForm";
import { SignUpForm, PendingTenantData } from "../auth/SignUpForm";
import { SocialAuthButtons } from "../auth/SocialAuthButtons";
import { OtpVerificationView } from "../auth/OtpVerificationView";
import { trpc } from "../../lib/trpc";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "signIn" | "signUp";
}

export function AuthModal({ isOpen, onClose, initialTab = "signIn" }: AuthModalProps) {
  const [tab, setTab] = useState<"signIn" | "signUp">(initialTab);
  const [error, setError] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [passwordForOtp, setPasswordForOtp] = useState<string | undefined>(undefined);
  const [pendingTenant, setPendingTenant] = useState<PendingTenantData | null>(null);

  const createTenant = trpc.createTenant.useMutation();

  useEffect(() => {
    setTab(initialTab);
    setError(null);
    setUnverifiedEmail(null);
    setPendingTenant(null);
  }, [initialTab, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleNeedOtp = (email: string, password?: string, pending?: PendingTenantData) => {
    setUnverifiedEmail(email);
    setPasswordForOtp(password);
    if (pending) setPendingTenant(pending);
  };

  const handleAuthSuccess = async () => {
    if (pendingTenant) {
      try {
        await createTenant.mutateAsync(pendingTenant);
      } catch (_e) {
        // Non-blocking if tenant creation handled elsewhere
      }
      onClose();
      window.location.href = "/setup";
      return;
    }
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 p-6 md:p-8 relative flex flex-col gap-5 overflow-hidden">
        <button
          type="button"
          onClick={onClose}
          aria-label={t("common.close")}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-full hover:bg-slate-100 cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex items-center gap-3">
          <Logo size="md" />
          <div>
            <h2 id="auth-modal-title" className="text-lg font-extrabold text-[#1B2B4B] tracking-tight">
              {unverifiedEmail
                ? t("auth.checkYourEmailTitle")
                : tab === "signIn"
                ? t("landing.authModalTitleSignIn")
                : t("landing.authModalTitleSignUp")}
            </h2>
            <p className="text-xs text-slate-500">
              {unverifiedEmail
                ? t("auth.otpLabel")
                : tab === "signIn"
                ? t("landing.authModalSubtitleSignIn")
                : t("landing.authModalSubtitleSignUp")}
            </p>
          </div>
        </div>

        {error && <FormErrorBanner message={error} />}

        {unverifiedEmail ? (
          <OtpVerificationView
            email={unverifiedEmail}
            password={passwordForOtp}
            onSuccess={handleAuthSuccess}
            onCancel={() => setUnverifiedEmail(null)}
          />
        ) : (
          <>
            <div className="flex bg-slate-100 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => {
                  setTab("signIn");
                  setError(null);
                }}
                className={`flex-1 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                  tab === "signIn"
                    ? "bg-white text-[#1B2B4B] shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {t("landing.authModalTabSignIn")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab("signUp");
                  setError(null);
                }}
                className={`flex-1 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                  tab === "signUp"
                    ? "bg-white text-[#1B2B4B] shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {t("landing.authModalTabSignUp")}
              </button>
            </div>

            <SocialAuthButtons
              mode={tab}
              redirectUrl="/dashboard"
              onError={(msg) => setError(msg)}
            />

            <div className="relative flex items-center justify-center">
              <div className="border-t border-slate-200 w-full" />
              <span className="bg-white px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider absolute">
                {t("landing.authModalOrContinue")}
              </span>
            </div>

            {tab === "signIn" ? (
              <SignInForm
                redirectUrl="/dashboard"
                onSuccess={handleAuthSuccess}
                onNeedOtp={handleNeedOtp}
                onInteract={() => setError(null)}
              />
            ) : (
              <SignUpForm
                redirectUrl="/dashboard"
                onSuccess={handleAuthSuccess}
                onNeedOtp={handleNeedOtp}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
