"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "../../../lib/trpc";
import posthog from "../../../lib/posthog-client";
import { useToast, buildRecurrenceRule } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";
import {
  IncomeItem,
  EstimatedCategoryItem,
  AccountType,
} from "@money-matters/types";
import { UserGoalItem } from "../components/SetupGoalsStep";
import { BankAccountRowItem } from "../components/SetupBankAccountRow";

interface SubmissionProps {
  isRerun: boolean;
  incomes: IncomeItem[];
  bankAccounts: BankAccountRowItem[];
  activeCategories: EstimatedCategoryItem[];
  goals: UserGoalItem[];
  categoryFrequencies: Record<string, "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "QUARTERLY" | "YEARLY">;
  removedCategoryNames?: Set<string>;
  archivedGoalIds: Set<string>;
  archivedAccountIds: Set<string>;
  archivedIncomeIds: Set<string>;
  existingPools?: Array<{
    id: string;
    name?: string;
    envelopeType?: string;
    bankAccountId?: string | null;
    isPrivate?: boolean | null;
    isSurplusTarget?: boolean | null;
    safetyBufferFloor?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    rrule?: string | null;
  }>;
}

function convertMonthlyToFrequencyAmount(
  monthlyAmount: number,
  freq: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "QUARTERLY" | "ANNUALLY"
): number {
  let result = monthlyAmount;
  if (freq === "WEEKLY") result = monthlyAmount / (52 / 12);
  else if (freq === "FORTNIGHTLY") result = monthlyAmount / (26 / 12);
  else if (freq === "QUARTERLY") result = monthlyAmount * 3;
  else if (freq === "ANNUALLY") result = monthlyAmount * 12;
  return Math.round(result * 100) / 100;
}

export function useSetupWizardSubmission({
  isRerun,
  incomes,
  bankAccounts,
  activeCategories,
  goals,
  categoryFrequencies,
  removedCategoryNames = new Set(),
  archivedGoalIds,
  archivedAccountIds,
  archivedIncomeIds,
  existingPools = [],
}: SubmissionProps) {
  const router = useRouter();
  const toast = useToast();
  const utils = trpc.useUtils();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const saveSetupBudgetMut = trpc.saveSetupBudget.useMutation();

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      const accountsPayload = bankAccounts.map((acc) => ({
        id: acc.id?.startsWith("acc-") ? undefined : acc.id,
        name: acc.name,
        bankProvider: acc.bankProvider || "Other",
        accountType: (acc.accountType as AccountType) || "EVERYDAY",
        lastKnownBalance: acc.lastKnownBalance || "0.00",
        unbudgetedBuffer: acc.unbudgetedBuffer || "0.00",
        isPrivate: Boolean(acc.isPrivate),
      }));

      const primaryBankAccountId = accountsPayload[0]?.id;
      const nonGoalCategories = activeCategories.filter((c) => c.type !== "GOAL");
      const activeGoalsList = goals.filter((g) => !removedCategoryNames.has(g.name));

      const hasExplicitCategorySurplus = nonGoalCategories.some((c) => Boolean(c.isSurplusTarget) && !c.isPrivate);
      let effectiveSurplusGoalIndex = activeGoalsList.findIndex((g) => Boolean(g.isSurplusTarget) && !g.isPrivate);
      if (effectiveSurplusGoalIndex === -1 && !hasExplicitCategorySurplus) {
        const emergencyIdx = activeGoalsList.findIndex(
          (g) =>
            !g.isPrivate &&
            (g.name.toLowerCase().includes("emergency") || g.name.toLowerCase().includes("reserve"))
        );
        effectiveSurplusGoalIndex = emergencyIdx !== -1
          ? emergencyIdx
          : activeGoalsList.findIndex((g) => !g.isPrivate);
      }

      const envelopesPayload = [
        ...nonGoalCategories.map((c, idx) => {
          const uiFreq = categoryFrequencies[c.name];
          const rawFreq = uiFreq || c.budgetFrequency || "MONTHLY";
          const budgetFreq: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "QUARTERLY" | "ANNUALLY" =
            rawFreq === "YEARLY" ? "ANNUALLY" : (rawFreq as "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "QUARTERLY" | "ANNUALLY") || "MONTHLY";
          const isEveryday = c.type === "EVERYDAY";
          const resolvedEnvelopeType: "EVERYDAY" | "BILL" = isEveryday ? "EVERYDAY" : "BILL";
          const fundingMode: "TARGET_BALANCE" | "RECURRING" = isEveryday
            ? "TARGET_BALANCE"
            : (c.fundingMode || "RECURRING");
          const isPriority = isEveryday ? false : (c.isPriority ?? true);
          const catId = c.id && !c.id.startsWith("temp-") && !c.id.startsWith("draft-") ? c.id : undefined;
          const matchedPool = (catId ? existingPools.find((p) => p.id === catId) : undefined) ||
            (isEveryday
              ? existingPools.find((p) => p.envelopeType === "EVERYDAY" && !p.isPrivate)
              : existingPools.find(
                  (p) =>
                    p.envelopeType === resolvedEnvelopeType &&
                    p.name?.trim().toLowerCase() === c.name.trim().toLowerCase()
                ));
          const resolvedEnvId = catId || matchedPool?.id;
          const monthlyVal = c.monthlyAud || 0;
          const enteredVal =
            fundingMode === "RECURRING" && budgetFreq !== "MONTHLY"
              ? convertMonthlyToFrequencyAmount(monthlyVal, budgetFreq)
              : (c.enteredAmount !== undefined && c.enteredAmount !== null && budgetFreq === (c.budgetFrequency || "MONTHLY") && Math.abs(monthlyVal - (c.monthlyAud || 0)) < 0.01
                  ? c.enteredAmount
                  : monthlyVal);

          const isFallbackEverydaySurplus =
            isEveryday &&
            !c.isPrivate &&
            effectiveSurplusGoalIndex === -1 &&
            !hasExplicitCategorySurplus;

          return {
            id: resolvedEnvId,
            bankAccountId: c.bankAccountId || matchedPool?.bankAccountId || primaryBankAccountId,
            isPrivate: c.isPrivate ?? matchedPool?.isPrivate ?? false,
            isSurplusTarget: Boolean(c.isSurplusTarget || isFallbackEverydaySurplus),
            safetyBufferFloor: c.safetyBufferFloor !== undefined && c.safetyBufferFloor !== null
              ? c.safetyBufferFloor.toFixed(2)
              : (matchedPool?.safetyBufferFloor || "0.00"),
            name: c.name,
            envelopeType: resolvedEnvelopeType,
            fundingMode,
            isPriority,
            targetAmount: fundingMode === "TARGET_BALANCE" && !isEveryday ? monthlyVal.toFixed(2) : undefined,
            monthlyAmount: monthlyVal.toFixed(2),
            enteredAmount: enteredVal.toFixed(2),
            budgetFrequency: fundingMode === "TARGET_BALANCE" ? ("MONTHLY" as const) : budgetFreq,
            startDate: c.startDate || matchedPool?.startDate,
            endDate: c.endDate || matchedPool?.endDate,
            rrule: c.rrule || matchedPool?.rrule,
            generateEvents: c.generateEvents ?? true,
            orderIndex: idx,
          };
        }),
        ...activeGoalsList.map((g, idx) => {
          const goalId = g.id && !g.id.startsWith("g-") && !g.id.startsWith("temp-") && !g.id.startsWith("draft-") ? g.id : undefined;
          const matchedPool = (goalId ? existingPools.find((p) => p.id === goalId) : undefined) ||
            existingPools.find(
              (p) => p.envelopeType === "GOAL" && p.name?.trim().toLowerCase() === g.name.trim().toLowerCase()
            );
          const resolvedGoalId = goalId || matchedPool?.id;
          const fundingMode: "TARGET_BALANCE" | "RECURRING" = g.fundingMode || (!g.dueDate && Boolean(g.budgetFrequency) ? "RECURRING" : "TARGET_BALANCE");
          const isRecurring = fundingMode === "RECURRING";
          const rawAmt = g.enteredAmount !== undefined && g.enteredAmount !== null
            ? g.enteredAmount
            : (g.monthlyAmount || g.targetAmount || 0);
          const computedMonthly = isRecurring
            ? (g.budgetFrequency === "WEEKLY"
                ? (rawAmt * 52) / 12
                : g.budgetFrequency === "FORTNIGHTLY"
                ? (rawAmt * 26) / 12
                : g.budgetFrequency === "QUARTERLY"
                ? (rawAmt * 4) / 12
                : g.budgetFrequency === "ANNUALLY"
                ? rawAmt / 12
                : rawAmt)
            : (g.monthlyAmount || (g.targetAmount ? g.targetAmount / 12 : 100));

          return {
            id: resolvedGoalId,
            bankAccountId: g.bankAccountId || matchedPool?.bankAccountId || primaryBankAccountId,
            name: g.name,
            envelopeType: "GOAL" as const,
            fundingMode,
            targetAmount: (isRecurring
              ? (g.targetAmount !== undefined && g.targetAmount !== null && g.targetAmount > 0
                  ? g.targetAmount
                  : (g.enteredAmount || g.monthlyAmount || 0))
              : (g.targetAmount || g.monthlyAmount * 12 || 1000)
            ).toFixed(2),
            monthlyAmount: computedMonthly.toFixed(2),
            endDate: isRecurring ? null : (g.dueDate || null),
            enteredAmount: (g.enteredAmount !== undefined && g.enteredAmount !== null)
              ? g.enteredAmount.toFixed(2)
              : (g.monthlyAmount ? g.monthlyAmount.toFixed(2) : undefined),
            budgetFrequency: g.budgetFrequency || (isRecurring ? "MONTHLY" : undefined),
            startDate: g.startDate,
            rrule: g.rrule,
            isSurplusTarget: idx === effectiveSurplusGoalIndex,
            isPriority: g.isPriority ?? true,
            isPrivate: matchedPool?.isPrivate ?? Boolean(g.isPrivate),
            orderIndex: nonGoalCategories.length + idx,
          };
        }),
      ];

      const incomesPayload = incomes.map((inc) => {
        const incType: "SALARY" | "FREELANCE" | "INVESTMENT" | "OTHER" =
          inc.type === "BUSINESS" ? "FREELANCE" : inc.type === "SALARY" || inc.type === "OTHER" ? inc.type : "SALARY";
        const incFreq: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "QUARTERLY" | "ANNUALLY" | "CUSTOM" =
          inc.frequency === "WEEKLY" ||
          inc.frequency === "FORTNIGHTLY" ||
          inc.frequency === "MONTHLY" ||
          inc.frequency === "QUARTERLY" ||
          inc.frequency === "ANNUALLY"
            ? inc.frequency
            : "CUSTOM";
        const rrule =
          inc.rrule ||
          (incFreq !== "CUSTOM"
            ? buildRecurrenceRule(incFreq, inc.interval ?? 1)
            : "FREQ=MONTHLY");
        return {
          id: inc.id?.startsWith("inc-") ? undefined : inc.id,
          name: inc.name,
          type: incType,
          amount: (inc.amount || 0).toFixed(2),
          frequency: incFreq,
          rrule,
          receivingAccountId: inc.receivingAccountId || null,
          startDate: inc.startDate || null,
        };
      });

      const resolvedArchivedEnvelopeIds = Array.from(
        new Set([
          ...Array.from(archivedGoalIds),
          ...Array.from(removedCategoryNames)
            .map((name) => existingPools.find((c) => c.name === name)?.id)
            .filter((id): id is string => Boolean(id)),
        ])
      );

      await saveSetupBudgetMut.mutateAsync({
        incomes: incomesPayload,
        bankAccounts: accountsPayload.length > 0 ? accountsPayload : [
          { name: "Other Financial Institution (Everyday)", bankProvider: "Other", accountType: "EVERYDAY", lastKnownBalance: "1000.00", unbudgetedBuffer: "0.00", isPrivate: false }
        ],
        envelopes: envelopesPayload.length > 0 ? envelopesPayload : [
          { name: "Everyday Spending", envelopeType: "EVERYDAY", bankAccountId: primaryBankAccountId, monthlyAmount: "1000.00", isPriority: false, fundingMode: "TARGET_BALANCE" }
        ],
        archivedEnvelopeIds: resolvedArchivedEnvelopeIds,
        archivedAccountIds: Array.from(archivedAccountIds),
        archivedIncomeIds: Array.from(archivedIncomeIds),
      });

      utils.getTenantStatus.setData(undefined, (old) => (old ? { ...old, setupCompleted: true, setupStatus: "COMPLETED" } : undefined));
      void utils.getTenantStatus.refetch();
      void utils.invalidate();

      posthog.capture("setup_completed", { isRerun, income_count: incomes.length, category_count: activeCategories.length });
      if (isRerun) {
        toast.success(t("setup.recalibrateSuccess"));
      } else {
        toast.success(t("toasts.setupSaved"));
      }
      router.replace("/dashboard");
      setTimeout(() => {
        if (typeof window !== "undefined" && window.location.pathname.startsWith("/setup")) {
          window.location.assign("/dashboard");
        }
      }, 150);
    } catch (err: unknown) {
      console.error("Failed to complete setup:", err);
      toast.error(err instanceof Error ? err.message : t("setup.saveError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return { isSubmitting, handleFinish };
}
