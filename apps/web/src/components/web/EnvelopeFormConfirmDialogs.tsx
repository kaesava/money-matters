"use client";

import React from "react";
import { ConfirmDialog, useCurrencyLocale } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";
import { CrossBankTransferModal } from "./CrossBankTransferModal";

export interface CrossBankPromptState {
  sourceAccountName: string;
  destAccountName: string;
  amount: number;
}

interface EnvelopeFormConfirmDialogsProps {
  showArchiveConfirm: boolean;
  onCloseArchive: () => void;
  onConfirmArchive: () => void;
  showRuleChangeConfirm: boolean;
  onCloseRuleChange: () => void;
  onConfirmRuleChange: () => void;
  showBankChangeConfirm: boolean;
  onCloseBankChange: () => void;
  onConfirmBankChange: () => void;
  archiveTitle: string;
  archiveDescription: string;
  archiveConfirmLabel: string;
  type: "EVERYDAY" | "BILL" | "GOAL";
  fundingMode: "RECURRING" | "TARGET_BALANCE";
  goalStartDate: string;
  currentBalanceNum: number;
  oldBankName: string;
  newBankName: string;
  submitting: boolean;
  crossBankPrompt: CrossBankPromptState | null;
  onCloseCrossBankPrompt: () => void;
}

export function EnvelopeFormConfirmDialogs({
  showArchiveConfirm,
  onCloseArchive,
  onConfirmArchive,
  showRuleChangeConfirm,
  onCloseRuleChange,
  onConfirmRuleChange,
  showBankChangeConfirm,
  onCloseBankChange,
  onConfirmBankChange,
  archiveTitle,
  archiveDescription,
  archiveConfirmLabel,
  type,
  fundingMode,
  goalStartDate,
  currentBalanceNum,
  oldBankName,
  newBankName,
  submitting,
  crossBankPrompt,
  onCloseCrossBankPrompt,
}: EnvelopeFormConfirmDialogsProps) {
  const { locale, currency } = useCurrencyLocale();
  const formattedBalance = new Intl.NumberFormat(locale, { style: "currency", currency }).format(currentBalanceNum);

  return (
    <>
      <ConfirmDialog
        isOpen={showArchiveConfirm}
        onClose={onCloseArchive}
        onConfirm={onConfirmArchive}
        title={archiveTitle}
        description={archiveDescription}
        confirmLabel={archiveConfirmLabel}
        variant="danger"
        isLoading={submitting}
      />

      <ConfirmDialog
        isOpen={showRuleChangeConfirm}
        onClose={onCloseRuleChange}
        onConfirm={onConfirmRuleChange}
        title={t("modals.updateSchedule.confirmTitleExpense")}
        description={
          type === "GOAL"
            ? t("categories.confirmDescConvertToGoal")
            : fundingMode === "TARGET_BALANCE"
            ? t("categories.confirmDescConvertToFlexible")
            : t("modals.updateSchedule.confirmDescRuleChange", { startDate: goalStartDate || "" })
        }
        confirmLabel={t("modals.updateSchedule.confirmCta")}
        variant="warning"
        isLoading={submitting}
      />

      <ConfirmDialog
        isOpen={showBankChangeConfirm}
        onClose={onCloseBankChange}
        onConfirm={onConfirmBankChange}
        title={t("categories.bankChangeConfirmTitle")}
        description={t("categories.bankChangeConfirmMessage", {
          amount: formattedBalance,
          fromBank: oldBankName,
          toBank: newBankName,
        })}
        confirmLabel={t("categories.bankChangeConfirmCta")}
        variant="warning"
        isLoading={submitting}
      />

      <CrossBankTransferModal
        isOpen={!!crossBankPrompt}
        onClose={onCloseCrossBankPrompt}
        sourceAccountName={crossBankPrompt?.sourceAccountName ?? ""}
        destAccountName={crossBankPrompt?.destAccountName ?? ""}
        amount={crossBankPrompt?.amount ?? 0}
      />
    </>
  );
}
