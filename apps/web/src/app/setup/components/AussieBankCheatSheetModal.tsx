"use client";

import React from "react";
import { t } from "@money-matters/i18n";
import { ModalDialog, Button } from "@money-matters/ui/web";

interface AussieBankCheatSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AussieBankCheatSheetModal({ isOpen, onClose }: AussieBankCheatSheetModalProps) {
  if (!isOpen) return null;

  const banks = [
    {
      name: t("setup.bankAccountsStep.cheatSheetCba"),
      badge: "CBA",
      badgeBg: "bg-amber-400 text-slate-900",
      steps: t("setup.bankAccountsStep.cheatSheetCbaSteps"),
    },
    {
      name: t("setup.bankAccountsStep.cheatSheetUp"),
      badge: "UP",
      badgeBg: "bg-orange-500 text-white",
      steps: t("setup.bankAccountsStep.cheatSheetUpSteps"),
    },
    {
      name: t("setup.bankAccountsStep.cheatSheetMacquarie"),
      badge: "MQ",
      badgeBg: "bg-slate-900 text-white",
      steps: t("setup.bankAccountsStep.cheatSheetMacquarieSteps"),
    },
    {
      name: t("setup.bankAccountsStep.cheatSheetIng"),
      badge: "ING",
      badgeBg: "bg-orange-600 text-white",
      steps: t("setup.bankAccountsStep.cheatSheetIngSteps"),
    },
    {
      name: t("setup.bankAccountsStep.cheatSheetOther"),
      badge: "BIG 4",
      badgeBg: "bg-blue-600 text-white",
      steps: t("setup.bankAccountsStep.cheatSheetOtherSteps"),
    },
  ];

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      title={t("setup.bankAccountsStep.cheatSheetTitle")}
      maxWidth="max-w-xl"
    >
      <div className="space-y-4 py-2">
        <p className="text-xs text-slate-500 leading-relaxed">
          {t("setup.bankAccountsStep.cheatSheetSubtitle")}
        </p>

        <div className="space-y-3 pt-2">
          {banks.map((b) => (
            <div
              key={b.name}
              className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start gap-3"
            >
              <div
                className={`w-9 h-9 rounded-lg ${b.badgeBg} flex items-center justify-center font-black text-[11px] shrink-0 shadow-2xs`}
              >
                {b.badge}
              </div>
              <div className="space-y-1 min-w-0">
                <h4 className="text-xs font-bold text-[#1B2B4B]">{b.name}</h4>
                <p className="text-[11px] text-slate-600 leading-normal">{b.steps}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-100">
          <Button variant="primary" onClick={onClose}>
            {t("setup.bankAccountsStep.cheatSheetClose")}
          </Button>
        </div>
      </div>
    </ModalDialog>
  );
}
