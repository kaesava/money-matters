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
  removedCategoryNames?: Set<string>;
  archivedAccountIds: Set<string>;
  archivedIncomeIds: Set<string>;
  existingPools?: Array<{ id: string; name?: string; bankAccountId?: string | null; isPrivate?: boolean | null }>;
}

export function useSetupWizardSubmission({
  isRerun,
  incomes,
  bankAccounts,
  activeCategories,
  goals,
  categoryFrequencies,
  sweepQueue,
  removedCategoryNames = new Set(),
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

      // Find surplus target: Emergency Reserve -> first non-private goal -> everyday
      const surplusGoalIndex = goals.findIndex(
        (g) =>
          !g.isPrivate &&
          (g.name.toLowerCase().includes("emergency") || g.name.toLowerCase().includes("reserve"))
      );
      const effectiveSurplusIndex = surplusGoalIndex !== -1
        ? surplusGoalIndex
        : goals.findIndex((g) => !g.isPrivate);

      const envelopesPayload = [
        ...nonGoalCategories.map((c, idx) => {
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
            isEssential: isBill,
            orderIndex: idx,
          };
        }),
        ...goals.map((g, idx) => {
          const goalId = g.id?.startsWith("g-") ? undefined : g.id;
          const matchedPool = goalId ? existingPools.find((p) => p.id === goalId) : undefined;
          const isOngoing = g.goalMode === "ONGOING" || (!g.dueDate && g.budgetFrequency);
          const rawAmt = g.enteredAmount !== undefined && g.enteredAmount !== null
            ? g.enteredAmount
            : (g.monthlyAmount || g.targetAmount || 0);
          const computedMonthly = isOngoing
            ? (g.budgetFrequency === "WEEKLY"
                ? (rawAmt * 52) / 12
                : g.budgetFrequency === "FORTNIGHTLY"
                ? (rawAmt * 26) / 12
                : g.budgetFrequency === "ANNUALLY"
                ? rawAmt / 12
                : rawAmt)
            : (g.monthlyAmount || (g.targetAmount ? g.targetAmount / 12 : 100));

          return {
            id: goalId,
            bankAccountId: matchedPool?.bankAccountId || primaryBankAccountId,
            name: g.name,
            envelopeType: (isOngoing ? "ONGOING_GOAL" : "TARGET_GOAL") as "ONGOING_GOAL" | "TARGET_GOAL",
            goalMode: g.goalMode ?? (g.dueDate ? "TARGET_DATE" : "ONGOING"),
            targetAmount: (isOngoing ? (g.enteredAmount || g.monthlyAmount || g.targetAmount || 250) : (g.targetAmount || g.monthlyAmount * 12 || 1000)).toFixed(2),
            monthlyAmount: computedMonthly.toFixed(2),
            endDate: isOngoing ? null : (g.dueDate || null),
            enteredAmount: g.enteredAmount ? g.enteredAmount.toFixed(2) : (g.monthlyAmount ? g.monthlyAmount.toFixed(2) : undefined),
            budgetFrequency: g.budgetFrequency || (isOngoing ? "MONTHLY" : undefined),
            startDate: g.startDate,
            rrule: g.rrule,
            isSurplusTarget: idx === effectiveSurplusIndex,
            isCommitted: true,
            isPrivate: matchedPool?.isPrivate ?? Boolean(g.isPrivate),
            orderIndex: nonGoalCategories.length + idx,
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

      const resolvedArchivedEnvelopeIds = Array.from(removedCategoryNames)
        .map((name) => existingPools.find((c) => c.name === name)?.id)
        .filter((id): id is string => Boolean(id));

      await saveSetupBudgetMut.mutateAsync({
        incomes: incomesPayload,
        bankAccounts: accountsPayload.length > 0 ? accountsPayload : [
          { name: "Other Financial Institution (Everyday)", bankProvider: "Other", accountType: "EVERYDAY", lastKnownBalance: "1000.00", unbudgetedBuffer: "0.00", isPrivate: false }
        ],
        envelopes: envelopesPayload.length > 0 ? envelopesPayload : [
          { name: "Everyday Spending", envelopeType: "EVERYDAY", bankAccountId: primaryBankAccountId, monthlyAmount: "1000.00", isEssential: true }
        ],
        archivedEnvelopeIds: [...sweepQueue.map((s) => s.poolId), ...resolvedArchivedEnvelopeIds],
        archivedAccountIds: Array.from(archivedAccountIds),
        archivedIncomeIds: Array.from(archivedIncomeIds),
      });

      utils.getTenantStatus.setData(undefined, (old) => (old ? { ...old, setupCompleted: true } : undefined));
      await utils.getTenantStatus.refetch();
      await utils.invalidate();

      posthog.capture("setup_completed", { isRerun, income_count: incomes.length, category_count: activeCategories.length });
      if (isRerun) {
        toast.success(t("setup.recalibrateSuccess"));
      } else {
        toast.success(t("toasts.setupSaved"));
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
