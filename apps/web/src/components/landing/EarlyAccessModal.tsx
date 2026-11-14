"use client";

import React, { useState, useId } from "react";
import { t } from "@money-matters/i18n";
import { Button, ModalDialog } from "@money-matters/ui/web";
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
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      title={t("landing.earlyAccess.title")}
      subtitle={t("landing.earlyAccess.description")}
      isDirty={emailInput.trim().length > 0}
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 text-[#2563eb] flex items-center justify-center text-2xl">
          🚀
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
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
    </ModalDialog>
  );
}
