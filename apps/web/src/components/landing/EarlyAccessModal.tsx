"use client";

import React from "react";
import { t } from "@money-matters/i18n";
import { Button } from "@money-matters/ui/web";

export interface EarlyAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  emailInput: string;
  setEmailInput: (val: string) => void;
  onSubmit: (email: string) => void;
  isPending: boolean;
}

export function EarlyAccessModal({
  isOpen,
  onClose,
  emailInput,
  setEmailInput,
  onSubmit,
  isPending,
}: EarlyAccessModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full border border-[#e2e4e0] shadow-2xl relative space-y-4">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 text-lg font-bold cursor-pointer"
        >
          ✕
        </button>
        <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 text-[#2563eb] flex items-center justify-center text-2xl">
          🚀
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-bold text-[#1B2B4B]">{t("landing.earlyAccess.title", { defaultValue: "Money Matters is Almost Ready!" })}</h3>
          <p className="text-xs text-zinc-600 leading-relaxed">
            {t("landing.earlyAccess.description", { defaultValue: "We're currently performing final testing and polish to ensure your household budgeting experience is flawless. Sign-ups will open very soon." })}
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (emailInput.trim()) {
              onSubmit(emailInput.trim());
            }
          }}
          className="space-y-3 pt-2"
        >
          <label className="text-xs font-bold text-zinc-700 block">
            {t("landing.earlyAccess.notifyLabel", { defaultValue: "Get notified when we launch:" })}
          </label>
          <div className="flex gap-2">
            <input
              type="email"
              required
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="you@example.com"
              className="flex-1 px-3 py-2.5 text-xs font-medium rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
            />
            <Button
              type="submit"
              loading={isPending}
              disabled={!emailInput.trim()}
              className="shrink-0"
            >
              {t("landing.earlyAccess.notifyBtn")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
