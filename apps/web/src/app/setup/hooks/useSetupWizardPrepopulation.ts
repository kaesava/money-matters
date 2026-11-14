"use client";
import { getTenantDateString } from "@money-matters/core";


import { useEffect } from "react";
import { trpc } from "../../../lib/trpc";
import {
  IncomeItem,
  EstimatedCategoryItem,
  BankProvider,
  AccountType,
} from "@money-matters/types";
import { parseRecurrenceRule } from "@money-matters/ui/web";
import { UserGoalItem } from "../components/SetupGoalsStep";
import { BankAccountRowItem } from "../components/SetupBankAccountRow";

interface PrepopulationProps {
  isRerun: boolean;
  enabled?: boolean;
  setIncomes: React.Dispatch<React.SetStateAction<IncomeItem[]>>;
  setBankAccounts: React.Dispatch<React.SetStateAction<BankAccountRowItem[]>>;
  setGoals: React.Dispatch<React.SetStateAction<UserGoalItem[]>>;
  setCustomCategories: React.Dispatch<React.SetStateAction<EstimatedCategoryItem[]>>;
  setCategoryFrequencies?: React.Dispatch<
    React.SetStateAction<Record<string, "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "QUARTERLY" | "YEARLY">>
  >;
}

export function useSetupWizardPrepopulation({
  isRerun,
  enabled = true,
  setIncomes,
  setBankAccounts,
  setGoals,
  setCustomCategories,
  setCategoryFrequencies,
}: PrepopulationProps) {
  const poolsQuery = trpc.listEnvelopes.useQuery(undefined, { enabled });
  const bankAccountsQuery = trpc.getBankAccountsWithMappings.useQuery(undefined, { enabled });
  const incomeSourcesQuery = trpc.listIncomeSources.useQuery(undefined, { enabled });

  // Pre-populate bank accounts (both in normal mode and rerun)
  useEffect(() => {
    if (bankAccountsQuery.data && bankAccountsQuery.data.length > 0) {
      setBankAccounts(
        bankAccountsQuery.data.map((acc) => ({
          id: acc.id,
          name: acc.name,
          bankProvider: (acc.bankProvider as BankProvider) || "Other",
          accountType: (acc.accountType as AccountType) || "EVERYDAY",
          lastKnownBalance: String(acc.lastKnownBalance || "0.00"),
          unbudgetedBuffer: String(acc.unbudgetedBuffer || "0.00"),
          isPrivate: Boolean(acc.isPrivate),
        }))
      );
    }
  }, [bankAccountsQuery.data, setBankAccounts]);

  // Pre-populate incomes whenever existing records exist
  useEffect(() => {
    if (!incomeSourcesQuery.data || incomeSourcesQuery.data.length === 0) return;
    setIncomes(
      incomeSourcesQuery.data.map((inc) => {
        const parsed = parseRecurrenceRule(inc.rrule);
        return {
          id: inc.id,
          name: inc.name,
          amount: parseFloat(inc.amount || "0"),
          frequency: parsed.frequency,
          interval: parsed.interval ?? 1,
          rrule: inc.rrule,
          type: "SALARY",
          receivingAccountId: inc.receivingAccountId,
          startDate: inc.startDate || undefined,
        };
      })
    );
  }, [incomeSourcesQuery.data, setIncomes]);

  // Pre-populate goals & categories if in rerun mode
  useEffect(() => {
    if (!isRerun || !poolsQuery.data || poolsQuery.data.length === 0) return;

    const goalPools = poolsQuery.data.filter(
      (p) => p.envelopeType === "GOAL"
    );
    if (goalPools.length > 0) {
      setGoals(
        goalPools.map((g) => {
          const isOngoing = g.fundingMode === "RECURRING";
          const targetAmt = parseFloat(g.targetAmount || "0");
          const monthlyAmt = g.monthlyAmount ? parseFloat(g.monthlyAmount) : 0;
          const enteredAmt = g.enteredAmount ? parseFloat(g.enteredAmount) : (monthlyAmt || targetAmt);
          return {
            id: g.id,
            name: g.name,
            fundingMode: isOngoing ? ("RECURRING" as const) : ("TARGET_BALANCE" as const),
            isPriority: g.isPriority ?? true,
            isSurplusTarget: Boolean(g.isSurplusTarget),
            isPrivate: Boolean(g.isPrivate),
            bankAccountId: g.bankAccountId || null,
            currentBalance: typeof g.currentBalance === "number" ? g.currentBalance : parseFloat(String(g.currentBalance || "0")),
            monthlyAmount: isOngoing ? monthlyAmt : (monthlyAmt || (targetAmt > 0 ? Math.round(targetAmt / 12) : 0)),
            icon: "target",
            targetAmount: targetAmt,
            enteredAmount: enteredAmt,
            budgetFrequency: (g.budgetFrequency as "MONTHLY" | "WEEKLY" | "FORTNIGHTLY" | "QUARTERLY" | "ANNUALLY" | null) || undefined,
            startDate: g.startDate,
            rrule: g.rrule,
            dueDate: isOngoing ? null : (g.endDate || getTenantDateString(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000))),
          };
        })
      );
    }

    const nonGoalEnvelopes = poolsQuery.data.filter(
      (p) => p.envelopeType !== "GOAL"
    );
    if (nonGoalEnvelopes.length > 0) {
      setCustomCategories(
        nonGoalEnvelopes.map((c) => {
          const monthlyVal = parseFloat(c.monthlyAmount || c.targetAmount || "0");
          const enteredVal = c.enteredAmount ? parseFloat(c.enteredAmount) : monthlyVal;
          const freq = (c.budgetFrequency as "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "QUARTERLY" | "ANNUALLY" | null) || "MONTHLY";
          return {
            id: c.id,
            name: c.name,
            type: (c.envelopeType === "EVERYDAY" ? "EVERYDAY" : "BILL") as "BILL" | "GOAL" | "EVERYDAY",
            envelopeType: c.envelopeType,
            fundingMode: c.fundingMode || (c.envelopeType === "BILL" ? "RECURRING" : "TARGET_BALANCE"),
            isPriority: c.isPriority ?? (c.envelopeType === "BILL"),
            isSurplusTarget: Boolean(c.isSurplusTarget),
            isPrivate: Boolean(c.isPrivate),
            bankAccountId: c.bankAccountId || null,
            safetyBufferFloor: c.safetyBufferFloor ? parseFloat(String(c.safetyBufferFloor)) : 0,
            targetAmount: c.targetAmount ? parseFloat(String(c.targetAmount)) : null,
            enteredAmount: enteredVal,
            currentBalance: typeof c.currentBalance === "number" ? c.currentBalance : parseFloat(String(c.currentBalance || "0")),
            monthlyAud: monthlyVal,
            budgetFrequency: freq,
            startDate: c.startDate,
            endDate: c.endDate,
            rrule: c.rrule,
            generateEvents: (c as { generateEvents?: boolean }).generateEvents ?? true,
            hasScheduledEvents: (c as { hasScheduledEvents?: boolean }).hasScheduledEvents ?? false,
            icon: c.envelopeType === "EVERYDAY" ? "wallet" : "pin",
          };
        })
      );
      if (setCategoryFrequencies) {
        const freqMap: Record<string, "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "QUARTERLY" | "YEARLY"> = {};
        for (const c of nonGoalEnvelopes) {
          const rawFreq = c.budgetFrequency || "MONTHLY";
          freqMap[c.name] = rawFreq === "ANNUALLY" ? "YEARLY" : (rawFreq as "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "QUARTERLY");
        }
        setCategoryFrequencies((prev) => ({ ...freqMap, ...prev }));
      }
    }
  }, [isRerun, poolsQuery.data, setGoals, setCustomCategories, setCategoryFrequencies]);

  return {
    pools: poolsQuery.data || [],
    bankAccounts: bankAccountsQuery.data || [],
    incomeSources: incomeSourcesQuery.data || [],
    isLoading: incomeSourcesQuery.isLoading || bankAccountsQuery.isLoading || poolsQuery.isLoading,
  };
}
