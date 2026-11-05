import { useState, useMemo, useEffect } from "react";
import { trpc } from "../../../../lib/trpc";
import { t } from "@money-matters/i18n";
import { useResizableColumns } from "@money-matters/ui/web";
import { SpendingTimeframe } from "@money-matters/types";
import { getTenantDateString } from "@money-matters/core";
import { useLocale } from "../../../../providers/LocaleProvider";
import { PaydayPlanRecord } from "../../../../components/web/SlideOverAllocationDrawer";

interface UseHistoryPaydayDataOptions {
  bankAccounts: Array<{ id: string; name: string }>;
  bankAccountIdParam?: string;
  isActive: boolean;
}

export function useHistoryPaydayData({
  bankAccounts,
  bankAccountIdParam = "",
  isActive,
}: UseHistoryPaydayDataOptions) {
  const { fmt, fmtDate } = useLocale();

  const [planSearchQuery, setPlanSearchQuery] = useState("");
  const [debouncedPlanSearchQuery, setDebouncedPlanSearchQuery] = useState(planSearchQuery);
  const [planTimeframe, setPlanTimeframe] = useState<SpendingTimeframe>("90D");
  const [selectedBankFilter, setSelectedBankFilter] = useState("ALL");
  const [planSortColumn, setPlanSortColumn] = useState<
    "createdAt" | "expectedDate" | "incomeName" | "receivingAccount" | "amount"
  >("createdAt");
  const [planSortDirection, setPlanSortDirection] = useState<"asc" | "desc">("desc");
  const [planPage, setPlanPage] = useState(1);
  const [planPageSize, setPlanPageSize] = useState(25);
  const [activePlanForDrawer, setActivePlanForDrawer] = useState<PaydayPlanRecord | null>(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedPlanSearchQuery(planSearchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [planSearchQuery]);

  const { widths: planWidths, onMouseDown: onPlanMouseDown } = useResizableColumns({
    splitDate: 140,
    incomeDate: 130,
    incomeName: 260,
    receivingAccount: 180,
    amount: 130,
    details: 90,
  });

  const paydayPlansQuery = trpc.listAllAllocationPlans.useQuery(undefined, {
    enabled: isActive,
  });

  const paydayPlans = useMemo(() => {
    return (paydayPlansQuery.data as unknown as PaydayPlanRecord[]) || [];
  }, [paydayPlansQuery.data]);

  const uniqueBankAccounts = useMemo(() => {
    return bankAccounts.map((b) => b.name);
  }, [bankAccounts]);

  const activePlanBankAccountId = useMemo(() => {
    if (selectedBankFilter !== "ALL") {
      return bankAccounts.find((b) => b.name === selectedBankFilter)?.id;
    }
    return bankAccountIdParam || undefined;
  }, [selectedBankFilter, bankAccounts, bankAccountIdParam]);

  const incomeSplitAnalyticsQuery = trpc.getIncomeSplitAnalytics.useQuery(
    {
      timeframe: planTimeframe,
      bankAccountId: activePlanBankAccountId,
      searchQuery:
        debouncedPlanSearchQuery.trim().length >= 2
          ? debouncedPlanSearchQuery.trim()
          : undefined,
    },
    { enabled: isActive }
  );

  const matchedBankAccount = bankAccountIdParam
    ? bankAccounts.find((b) => b.id === bankAccountIdParam)
    : null;

  const incomeSplitLabels = useMemo(
    () => ({
      overviewTitle: t("transactions.reporting.incomeSplits.overviewTitle"),
      overviewSubtitle: t("transactions.reporting.incomeSplits.overviewSubtitle"),
      filteredOverviewTitle: t("transactions.reporting.incomeSplits.filteredOverviewTitle"),
      filteredOverviewSubtitle: t("transactions.reporting.incomeSplits.filteredOverviewSubtitle"),
      donutTitle: t("transactions.reporting.incomeSplits.donutTitle"),
      filteredDonutTitle: t("transactions.reporting.incomeSplits.filteredDonutTitle"),
      cashFlowTitle: t("transactions.reporting.incomeSplits.cashFlowTitle"),
      filteredCashFlowTitle: t("transactions.reporting.incomeSplits.filteredCashFlowTitle"),
      topPoolsTitle: t("transactions.reporting.incomeSplits.topPoolsTitle"),
      filteredTopPoolsTitle: t("transactions.reporting.incomeSplits.filteredTopPoolsTitle"),
      inflowLegend: t("transactions.reporting.incomeSplits.inflow"),
      outflowLegend: t("transactions.reporting.incomeSplits.sweepOutflow"),
      centerLabel: t("transactions.reporting.incomeSplits.totalAllocated"),
      emptyText: t("transactions.reporting.incomeSplits.empty"),
    }),
    []
  );

  const filteredPaydayPlans = useMemo(() => {
    return paydayPlans.filter((plan) => {
      if (
        selectedBankFilter !== "ALL" &&
        (plan.receivingAccountName || "Main Account") !== selectedBankFilter
      ) {
        return false;
      }
      if (
        bankAccountIdParam &&
        matchedBankAccount &&
        plan.receivingAccountName !== matchedBankAccount.name
      ) {
        return false;
      }
      if (planSearchQuery.trim()) {
        const q = planSearchQuery.toLowerCase().trim();
        const incName = (plan.incomeName || "Income Deposit").toLowerCase();
        const bankName = (plan.receivingAccountName || "Main Account").toLowerCase();
        const amtStr = String(plan.totalIncomeAmount);
        return incName.includes(q) || bankName.includes(q) || amtStr.includes(q);
      }
      return true;
    });
  }, [paydayPlans, selectedBankFilter, planSearchQuery, bankAccountIdParam, matchedBankAccount]);

  const sortedPaydayPlans = useMemo(() => {
    return [...filteredPaydayPlans].sort((a, b) => {
      let cmp = 0;
      if (planSortColumn === "createdAt") {
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        cmp = timeA - timeB;
      } else if (planSortColumn === "expectedDate") {
        const timeA = new Date(a.expectedDate || 0).getTime();
        const timeB = new Date(b.expectedDate || 0).getTime();
        cmp = timeA - timeB;
      } else if (planSortColumn === "incomeName") {
        cmp = (a.incomeName || "").localeCompare(b.incomeName || "");
      } else if (planSortColumn === "receivingAccount") {
        cmp = (a.receivingAccountName || "").localeCompare(b.receivingAccountName || "");
      } else if (planSortColumn === "amount") {
        cmp =
          parseFloat(String(a.totalIncomeAmount || 0)) -
          parseFloat(String(b.totalIncomeAmount || 0));
      }
      return planSortDirection === "asc" ? cmp : -cmp;
    });
  }, [filteredPaydayPlans, planSortColumn, planSortDirection]);

  const planTotalPages = Math.ceil(sortedPaydayPlans.length / planPageSize) || 1;
  const paginatedPaydayPlans = useMemo(() => {
    const start = (planPage - 1) * planPageSize;
    return sortedPaydayPlans.slice(start, start + planPageSize);
  }, [sortedPaydayPlans, planPage, planPageSize]);

  const handlePlanSort = (
    column: "createdAt" | "expectedDate" | "incomeName" | "receivingAccount" | "amount"
  ) => {
    if (planSortColumn === column) {
      setPlanSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setPlanSortColumn(column);
      setPlanSortDirection(
        column === "createdAt" || column === "expectedDate" || column === "amount"
          ? "desc"
          : "asc"
      );
    }
  };

  const handleExportAuditCSV = () => {
    if (!paydayPlansQuery.data) return;
    const headers = [
      "Payday Plan Date",
      "Income Date",
      "Income Source",
      "Receiving Bank Account",
      "Total Income Amount",
      "Envelope",
      "Planned Amount",
      "Reasoning",
    ];
    const rows: string[][] = [];

    for (const plan of paydayPlans) {
      const splitDateStr = fmtDate(plan.createdAt);
      const incDateStr = fmtDate(plan.expectedDate || plan.createdAt);
      const incName = plan.incomeName || "Income Deposit";
      const bankName = plan.receivingAccountName || "Main Account";
      const totalAmt = plan.totalIncomeAmount;

      for (const line of plan.lines) {
        rows.push([
          splitDateStr,
          incDateStr,
          `"${incName.replace(/"/g, '""')}"`,
          `"${bankName.replace(/"/g, '""')}"`,
          totalAmt,
          `"${(line.categoryName || "Unknown").replace(/"/g, '""')}"`,
          line.confirmedAmount || line.proposedAmount,
          `"${(line.reasoning || "").replace(/"/g, '""')}"`,
        ]);
      }
    }

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const todayStr = getTenantDateString(new Date());
    link.setAttribute("download", `money_matters_income_splits_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return {
    planSearchQuery,
    setPlanSearchQuery,
    planTimeframe,
    setPlanTimeframe,
    selectedBankFilter,
    setSelectedBankFilter,
    planSortColumn,
    planSortDirection,
    handlePlanSort,
    planPage,
    setPlanPage,
    planPageSize,
    setPlanPageSize,
    activePlanForDrawer,
    setActivePlanForDrawer,
    planWidths,
    onPlanMouseDown,
    paydayPlansQuery,
    incomeSplitAnalyticsQuery,
    uniqueBankAccounts,
    matchedBankAccount,
    incomeSplitLabels,
    sortedPaydayPlans,
    paginatedPaydayPlans,
    planTotalPages,
    handleExportAuditCSV,
    fmt,
    fmtDate,
  };
}
