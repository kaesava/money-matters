"use client";

import React, { useState, useEffect, useId } from "react";
import { t } from "@money-matters/i18n";
import { Button } from "@money-matters/ui/web";
import { z } from "zod";

const emailSchema = z.string().email();

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
  const emailInputId = useId();
  const [touched, setTouched] = useState(false);

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

  const isValidEmail = emailSchema.safeParse(emailInput.trim()).success;
  const showError = touched && emailInput.trim().length > 0 && !isValidEmail;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (isValidEmail) {
      onSubmit(emailInput.trim());
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="early-access-modal-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full border border-[#e2e4e0] shadow-2xl relative space-y-4">
        <button
          type="button"
          onClick={onClose}
          aria-label={t("common.close")}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 text-lg font-bold cursor-pointer"
        >
          ✕
        </button>
        <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 text-[#2563eb] flex items-center justify-center text-2xl">
          🚀
        </div>
        <div className="space-y-1">
          <h3 id="early-access-modal-title" className="text-xl font-bold text-[#1B2B4B]">
            {t("landing.earlyAccess.title")}
          </h3>
          <p className="text-xs text-zinc-600 leading-relaxed">
            {t("landing.earlyAccess.description")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 pt-2">
          <div>
            <label htmlFor={emailInputId} className="text-xs font-bold text-zinc-700 block mb-1">
              {t("landing.earlyAccess.notifyLabel")} <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                id={emailInputId}
                type="text"
                autoFocus
                value={emailInput}
                onChange={(e) => {
                  setEmailInput(e.target.value);
                  if (!touched) setTouched(true);
                }}
                placeholder="you@example.com"
                className="flex-1 px-3 py-2.5 text-xs font-medium rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
              />
              <Button
                type="submit"
                loading={isPending}
                disabled={!isValidEmail || isPending}
                className="shrink-0"
              >
                {t("landing.earlyAccess.notifyBtn")}
              </Button>
            </div>
            {showError && (
              <p className="text-xs text-red-500 mt-1 font-medium">
                {t("validation.invalidEmail")}
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
