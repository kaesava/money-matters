"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "../../../lib/trpc";
import posthog from "../../../lib/posthog-client";
import { useToast } from "@money-matters/ui/web";
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
  categoryFrequencies: Record<string, "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "YEARLY">;
  sweepQueue: Array<{ poolId: string; sweepDestinationPoolId?: string | null }>;
  archivedAccountIds: Set<string>;
  archivedIncomeIds: Set<string>;
  existingPools?: Array<{ id: string; bankAccountId?: string | null; isPrivate?: boolean | null }>;
}

export function useSetupWizardSubmission({
  isRerun,
  incomes,
  bankAccounts,
  activeCategories,
  goals,
  categoryFrequencies,
  sweepQueue,
  archivedAccountIds,
  archivedIncomeIds,
  existingPools = [],
}: SubmissionProps) {
  const router = useRouter();
  const toast = useToast();
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

      const envelopesPayload = [
        ...activeCategories.map((c, idx) => {
          const rawFreq = categoryFrequencies[c.name];
          const budgetFreq = rawFreq === "YEARLY" ? ("ANNUALLY" as const) : ("MONTHLY" as const);
          const catId = "id" in c && typeof c.id === "string" && !c.id.startsWith("temp-") ? c.id : undefined;
          const matchedPool = catId ? existingPools.find((p) => p.id === catId) : undefined;
          const isEveryday = c.type === "EVERYDAY";
          const isBill = c.type === "REGULAR";
          return {
            id: catId,
            bankAccountId: matchedPool?.bankAccountId || primaryBankAccountId,
            isPrivate: matchedPool?.isPrivate ?? false,
            name: c.name,
            envelopeType: (isEveryday ? "EVERYDAY" : isBill ? "SCHEDULED_BILL" : "TARGET_GOAL") as "EVERYDAY" | "SCHEDULED_BILL" | "TARGET_GOAL",
            monthlyAmount: (c.monthlyAud || 0).toFixed(2),
            enteredAmount: (c.monthlyAud || 0).toFixed(2),
            budgetFrequency: budgetFreq,
            icon: c.icon || "wallet",
            isEssential: isBill,
            orderIndex: idx,
          };
        }),
        ...goals.map((g, idx) => {
          const goalId = g.id?.startsWith("g-") ? undefined : g.id;
          const matchedPool = goalId ? existingPools.find((p) => p.id === goalId) : undefined;
          return {
            id: goalId,
            bankAccountId: matchedPool?.bankAccountId || primaryBankAccountId,
            name: g.name,
            envelopeType: (g.goalMode === "ONGOING" ? "ONGOING_GOAL" : "TARGET_GOAL") as "ONGOING_GOAL" | "TARGET_GOAL",
            goalMode: g.goalMode ?? (g.dueDate ? "TARGET_DATE" : "ONGOING"),
            targetAmount: (g.goalMode === "ONGOING" ? (g.monthlyAmount || g.targetAmount || 250) : (g.targetAmount || g.monthlyAmount * 12 || 1000)).toFixed(2),
            targetDate: g.goalMode === "ONGOING" ? null : (g.dueDate || null),
            enteredAmount: g.enteredAmount ? g.enteredAmount.toFixed(2) : undefined,
            budgetFrequency: g.budgetFrequency,
            startDate: g.startDate,
            rrule: g.rrule,
            isSurplusTarget: idx === 0,
            isCommitted: true,
            isPrivate: matchedPool?.isPrivate ?? false,
            orderIndex: activeCategories.length + idx,
          };
        }),
      ];

      const incomesPayload = incomes.map((inc) => {
        const incType: "SALARY" | "FREELANCE" | "INVESTMENT" | "OTHER" =
          inc.type === "BUSINESS" ? "FREELANCE" : inc.type === "SALARY" || inc.type === "OTHER" ? inc.type : "SALARY";
        const incFreq: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "CUSTOM" =
          inc.frequency === "WEEKLY" || inc.frequency === "FORTNIGHTLY" || inc.frequency === "MONTHLY" ? inc.frequency : "CUSTOM";
        return {
          id: inc.id?.startsWith("inc-") ? undefined : inc.id,
          name: inc.name,
          type: incType,
          amount: (inc.amount || 0).toFixed(2),
          frequency: incFreq,
          receivingAccountId: inc.receivingAccountId || null,
          startDate: inc.startDate || null,
        };
      });

      await saveSetupBudgetMut.mutateAsync({
        incomes: incomesPayload,
        bankAccounts: accountsPayload.length > 0 ? accountsPayload : [
          { name: "Other Financial Institution (Everyday)", bankProvider: "Other", accountType: "EVERYDAY", lastKnownBalance: "1000.00", unbudgetedBuffer: "0.00", isPrivate: false }
        ],
        envelopes: envelopesPayload.length > 0 ? envelopesPayload : [
          { name: "Everyday Spending", envelopeType: "EVERYDAY", bankAccountId: primaryBankAccountId, monthlyAmount: "1000.00", isEssential: true }
        ],
        archivedEnvelopeIds: sweepQueue.map((s) => s.poolId),
        archivedAccountIds: Array.from(archivedAccountIds),
        archivedIncomeIds: Array.from(archivedIncomeIds),
      });

      posthog.capture("setup_completed", { isRerun, income_count: incomes.length, category_count: activeCategories.length });
      if (isRerun) {
        toast.success(t("setup.recalibrateSuccess"));
      }
      router.push("/dashboard");
    } catch (err: unknown) {
      console.error("Failed to complete setup:", err);
      toast.error(err instanceof Error ? err.message : t("setup.saveError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return { isSubmitting, handleFinish };
}
