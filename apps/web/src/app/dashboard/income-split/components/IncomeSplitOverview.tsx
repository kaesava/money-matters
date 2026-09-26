"use client";

import React, { useMemo } from "react";
import { trpc } from "../../../../lib/trpc";
import { Spinner, InfoTooltip } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";
import { MatrixPlanTab } from "../../income-and-bills/components/MatrixPlanTab";

export function IncomeSplitOverview() {
  const poolsQuery = trpc.listPools.useQuery();
  const categoriesQuery = trpc.listCategories.useQuery();
  const bankAccountsQuery = trpc.listBankAccounts.useQuery();
  const incomeEventsQuery = trpc.listIncomeEvents.useQuery();
  const expenseEventsQuery = trpc.listExpenseEvents.useQuery();
  const userProfileQuery = trpc.getUserProfile.useQuery();

  const isLoading =
    poolsQuery.isLoading ||
    categoriesQuery.isLoading ||
    bankAccountsQuery.isLoading ||
    incomeEventsQuery.isLoading ||
    expenseEventsQuery.isLoading;

  const rawPools = poolsQuery.data;
  const rawBankAccounts = bankAccountsQuery.data;
  const rawIncomeEvents = incomeEventsQuery.data;
  const rawExpenseEvents = expenseEventsQuery.data;

  const pools = useMemo(() => rawPools || [], [rawPools]);
  const bankAccounts = useMemo(() => rawBankAccounts || [], [rawBankAccounts]);
  const incomeEvents = useMemo(() => rawIncomeEvents || [], [rawIncomeEvents]);
  const expenseEvents = useMemo(() => rawExpenseEvents || [], [rawExpenseEvents]);

  const matrixIncomeEvents = useMemo(() => {
    return incomeEvents
      .filter((e) => e && Boolean(e.expectedDate) && String(e.expectedDate).length >= 10)
      .map((e) => {
        const receivingAccountId = (e as unknown as { receivingAccountId?: string }).receivingAccountId;
        const acct = bankAccounts.find((b) => b.id === receivingAccountId);
        return {
          id: e.id,
          expectedDate: e.expectedDate,
          expectedAmount: parseFloat(e.expectedAmount || "0"),
          actualAmount: e.actualAmount ? parseFloat(e.actualAmount) : null,
          status: (e.status as "PENDING" | "CONFIRMED") || "PENDING",
          sourceName: (e as unknown as { name?: string; sourceName?: string }).name || e.sourceName || "Paycheck",
          isPrivate: acct?.isPrivate || false,
        };
      });
  }, [incomeEvents, bankAccounts]);

  const matrixExpenseEvents = useMemo(() => {
    return expenseEvents
      .filter((e) => e && Boolean(e.expectedDate) && String(e.expectedDate).length >= 10)
      .map((e) => ({
        categoryId: e.poolId || e.categoryId || "",
        amount: parseFloat(e.expectedAmount || "0"),
        dueDate: e.expectedDate,
        status: (e.status as "PENDING" | "CONFIRMED") || "PENDING",
      }));
  }, [expenseEvents]);

  const matrixCategories = useMemo(() => {
    const catTargetMap = new Map<string, number>();
    if (categoriesQuery.data) {
      for (const cat of categoriesQuery.data) {
        if (cat.monthlyAmount) {
          const val = parseFloat(cat.monthlyAmount);
          catTargetMap.set(cat.poolId, (catTargetMap.get(cat.poolId) || 0) + val);
        }
      }
    }

    return pools.map((p) => {
      const catTargetSum = catTargetMap.get(p.id) || 0;
      const monthlyAmt =
        p.poolType === "REGULAR"
          ? catTargetSum > 0
            ? catTargetSum
            : p.targetAmount
            ? parseFloat(p.targetAmount)
            : null
          : p.targetAmount
          ? parseFloat(p.targetAmount)
          : null;

      return {
        id: p.id,
        name: p.name,
        type: p.poolType as "REGULAR" | "GOAL" | "EVERYDAY",
        currentBalance: parseFloat(String(p.currentBalance || "0")),
        monthlyAmount: monthlyAmt,
        targetAmount: p.targetAmount ? parseFloat(p.targetAmount) : null,
        everydayAllowanceAmount: p.everydayAllowanceAmount ? parseFloat(p.everydayAllowanceAmount) : null,
        isCommitted: p.isCommitted ?? undefined,
        isSurplusTarget: p.isSurplusTarget ?? undefined,
        isPrivate: p.isPrivate ?? undefined,
        targetDate: p.targetDate || null,
      };
    });
  }, [pools, categoriesQuery.data]);

  const currentUserId = userProfileQuery.data?.id || pools[0]?.id || "default-user";

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner size="lg" label={t("common.loading")} direction="col" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-16 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-black text-[#1B2B4B] flex items-center gap-2">
            <span>{t("nav.splitIncome") || "Split Income"}</span>
            <InfoTooltip
              title={t("tooltips.incomeBills.title")}
              content={t("tooltips.incomeBills.content")}
            />
          </h1>
        </div>
      </div>

      <MatrixPlanTab
        currentUserId={currentUserId}
        categories={matrixCategories}
        incomeEvents={matrixIncomeEvents}
        expenseEvents={matrixExpenseEvents}
      />
    </div>
  );
}
