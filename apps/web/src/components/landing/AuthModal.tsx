"use client";

import React, { useState, useEffect } from "react";
import { t } from "@money-matters/i18n";
import { Logo, FormErrorBanner, ModalDialog } from "@money-matters/ui/web";
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
  const [prefillEmail, setPrefillEmail] = useState<string>("");
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [passwordForOtp, setPasswordForOtp] = useState<string | undefined>(undefined);
  const [pendingTenant, setPendingTenant] = useState<PendingTenantData | null>(null);

  const createTenant = trpc.createTenant.useMutation();

  useEffect(() => {
    setTab(initialTab);
    setError(null);
    setPrefillEmail("");
    setUnverifiedEmail(null);
    setPendingTenant(null);
  }, [initialTab, isOpen]);

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

  const titleText = unverifiedEmail
    ? t("auth.checkYourEmailTitle")
    : tab === "signIn"
    ? t("landing.authModalTitleSignIn")
    : t("landing.authModalTitleSignUp");

  const subtitleText = unverifiedEmail
    ? t("auth.otpLabel")
    : tab === "signIn"
    ? t("landing.authModalSubtitleSignIn")
    : t("landing.authModalSubtitleSignUp");

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-md"
      title={
        <div className="flex items-center gap-3">
          <Logo size="md" />
          <span>{titleText}</span>
        </div>
      }
      subtitle={subtitleText}
    >
      <div className="flex flex-col gap-5">
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
                initialEmail={prefillEmail}
                onSuccess={handleAuthSuccess}
                onNeedOtp={handleNeedOtp}
                onInteract={() => setError(null)}
              />
            ) : (
              <SignUpForm
                redirectUrl="/dashboard"
                onSuccess={handleAuthSuccess}
                onNeedOtp={handleNeedOtp}
                onExistingUser={(em) => {
                  setPrefillEmail(em);
                  setTab("signIn");
                  setError(t("auth.userAlreadyExists"));
                }}
              />
            )}
          </>
        )}
      </div>
    </ModalDialog>
  );
}
