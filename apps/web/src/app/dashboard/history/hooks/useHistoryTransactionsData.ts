import { useState, useMemo, useEffect } from "react";
import { trpc } from "../../../../lib/trpc";
import { t } from "@money-matters/i18n";
import { useResizableColumns } from "@money-matters/ui/web";
import { SpendingTimeframe } from "@money-matters/types";
import { getTenantDateString } from "@money-matters/core";
import { useLocale } from "../../../../providers/LocaleProvider";

export interface TransactionRowItem {
  id: string;
  recordedAt: string;
  date: string;
  description: string;
  categoryName: string;
  poolId: string;
  envelopeId: string;
  bankAccountId: string | null;
  transactionType: string | null;
  poolName: string;
  rawCategoryName: string;
  categoryType?: string;
  amount: string;
  type: "TRANSFER" | "DEBIT" | "CREDIT";
  flowType: "DEBIT" | "CREDIT";
  source: string;
}

export function getTransactionTypeLabel(type?: string | null): string {
  switch (type) {
    case "EXPENSE":
      return t("transactions.types.expense");
    case "INCOME_SPLIT":
      return t("transactions.types.incomeTopup");
    case "INCOME_DIRECT":
      return t("transactions.types.incomeDirect");
    case "TRANSFER_OUT":
      return t("transactions.types.transferOut");
    case "TRANSFER_IN":
      return t("transactions.types.transferIn");
    case "ACCOUNT_ALIGNMENT":
      return t("transactions.types.accountAlignment");
    case "BALANCE_ADJUSTMENT":
      return t("transactions.types.balanceAdjustment");
    case "OPENING_BALANCE":
      return t("transactions.types.openingBalance");
    default:
      return type ? type.replace(/_/g, " ") : "Transaction";
  }
}

interface UseHistoryTransactionsDataOptions {
  pools: Array<{
    id: string;
    name: string;
    envelopeType?: string;
    currentBalance: string | number;
    isPrivate?: boolean | null;
  }>;
  bankAccounts: Array<{ id: string; name: string }>;
  poolIdParam?: string;
  bankAccountIdParam?: string;
  initialSearch?: string;
  isActive: boolean;
}

interface RawTransactionItem {
  id: string;
  recordedAt: string;
  note?: string | null;
  source?: string | null;
  transferGroupId?: string | null;
  bankAccountId?: string | null;
  transactionType: string | null;
  amount: string;
  flowType: string;
  envelopeId?: string;
  envelopeName?: string;
  poolId?: string;
  poolName?: string;
  categoryName?: string;
}

export function useHistoryTransactionsData({
  pools,
  bankAccounts,
  poolIdParam = "",
  bankAccountIdParam = "",
  initialSearch = "",
  isActive,
}: UseHistoryTransactionsDataOptions) {
  const { fmt, fmtDate, currency } = useLocale();

  const [filterType, setFilterType] = useState<"ALL" | "DEBIT" | "CREDIT" | "TRANSFER">("ALL");
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedPool, setSelectedPool] = useState<string>("ALL");
  const [sortColumn, setSortColumn] = useState<"recordedAt" | "transactionType" | "description" | "amount">("recordedAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [timeframe, setTimeframe] = useState<SpendingTimeframe>("90D");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);

  const { widths, onMouseDown } = useResizableColumns({
    date: 120,
    type: 140,
    description: 260,
    category: 180,
    amount: 140,
  });

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [filterType, searchQuery, selectedPool, sortColumn, sortDirection]);

  const transactionsQuery = trpc.listTransactions.useQuery(
    { limit: 500, offset: 0 },
    { enabled: isActive }
  );

  const spendingAnalyticsQuery = trpc.getSpendingAnalytics.useQuery(
    {
      timeframe,
      envelopeId: selectedPool !== "ALL" ? selectedPool : (poolIdParam || undefined),
      bankAccountId: bankAccountIdParam || undefined,
      searchQuery: debouncedSearchQuery.trim().length >= 2 ? debouncedSearchQuery.trim() : undefined,
      flowType: filterType,
    },
    { enabled: isActive }
  );

  const poolMap = useMemo(() => new Map(pools.map((p) => [p.id, p.name])), [pools]);

  const allTransactions = useMemo<TransactionRowItem[]>(() => {
    const rawTransactions = (transactionsQuery.data ?? []) as unknown as RawTransactionItem[];
    const envelopeTypeMap = new Map(pools.map((p) => [p.name, p.envelopeType]));

    return rawTransactions.map((tx: RawTransactionItem) => {
      const txObj = tx as unknown as {
        envelopeId?: string;
        envelopeName?: string;
        poolId?: string;
        poolName?: string;
        categoryName?: string;
      };
      const envId = txObj.envelopeId || txObj.poolId || "";
      const pName = txObj.poolName || (envId ? poolMap.get(envId) : undefined) || "";
      const cName = txObj.categoryName || "";
      const displayLabel = pName || cName || "Everyday Envelope";

      const isTransfer =
        Boolean(tx.transferGroupId) ||
        tx.note?.startsWith("Transferred") ||
        tx.note?.startsWith("Transfer from") ||
        tx.note?.includes("➔");

      return {
        id: tx.id,
        recordedAt: tx.recordedAt,
        date: fmtDate(tx.recordedAt),
        description: tx.note || `Transaction (${tx.source || "MANUAL"})`,
        categoryName: displayLabel,
        poolId: envId,
        envelopeId: envId,
        bankAccountId: tx.bankAccountId || null,
        transactionType: tx.transactionType,
        poolName: pName,
        rawCategoryName: cName,
        categoryType: envelopeTypeMap.get(pName),
        amount: tx.amount,
        type: isTransfer ? ("TRANSFER" as const) : (tx.flowType as "DEBIT" | "CREDIT"),
        flowType: tx.flowType as "DEBIT" | "CREDIT",
        source: tx.source || "MANUAL",
      };
    });
  }, [transactionsQuery.data, pools, poolMap, fmtDate]);

  const matchedPool = poolIdParam ? pools.find((p) => p.id === poolIdParam) : null;
  const matchedBankAccount = bankAccountIdParam
    ? bankAccounts.find((b) => b.id === bankAccountIdParam)
    : null;

  const isFilterParamInvalid = Boolean(
    (poolIdParam && !matchedPool) || (bankAccountIdParam && !matchedBankAccount)
  );

  const filteredTransactions = useMemo(() => {
    return allTransactions.filter((tx) => {
      if (filterType !== "ALL" && tx.type !== filterType) return false;
      if (poolIdParam && matchedPool && tx.poolId !== poolIdParam) return false;
      if (bankAccountIdParam && matchedBankAccount && tx.bankAccountId !== bankAccountIdParam)
        return false;
      if (selectedPool !== "ALL") {
        const selectedPoolObj = pools.find((p) => p.id === selectedPool);
        const selectedName = selectedPoolObj?.name;
        const matchesPool =
          (tx.poolName && tx.poolName === selectedName) ||
          tx.categoryName.includes(selectedName || selectedPool);
        if (!matchesPool) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          tx.description.toLowerCase().includes(q) ||
          tx.categoryName.toLowerCase().includes(q) ||
          (tx.poolName && tx.poolName.toLowerCase().includes(q)) ||
          (tx.rawCategoryName && tx.rawCategoryName.toLowerCase().includes(q)) ||
          tx.amount.includes(q)
        );
      }
      return true;
    });
  }, [
    allTransactions,
    filterType,
    selectedPool,
    searchQuery,
    pools,
    poolIdParam,
    matchedPool,
    bankAccountIdParam,
    matchedBankAccount,
  ]);

  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      let cmp = 0;
      if (sortColumn === "recordedAt") {
        cmp = new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime();
      } else if (sortColumn === "transactionType") {
        cmp = (a.transactionType || "").localeCompare(b.transactionType || "");
      } else if (sortColumn === "description") {
        cmp = a.description.localeCompare(b.description);
      } else if (sortColumn === "amount") {
        cmp = parseFloat(a.amount) - parseFloat(b.amount);
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });
  }, [filteredTransactions, sortColumn, sortDirection]);

  const totalPages = Math.ceil(sortedTransactions.length / pageSize) || 1;
  const paginatedTransactions = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedTransactions.slice(start, start + pageSize);
  }, [sortedTransactions, page, pageSize]);

  const handleExportCSV = () => {
    if (sortedTransactions.length === 0) return;
    const currencyLabel = currency || "AUD";
    const headers = [
      t("transactions.exportHeaders.date"),
      t("transactions.exportHeaders.type"),
      t("transactions.exportHeaders.description"),
      t("transactions.exportHeaders.envelope"),
      t("transactions.exportHeaders.source"),
      t("transactions.exportHeaders.amountWithCurrency", { currency: currencyLabel }),
    ];
    const rows = sortedTransactions.map((tx) => [
      `"${tx.date}"`,
      `"${getTransactionTypeLabel(tx.transactionType)}"`,
      `"${tx.description.replace(/"/g, '""')}"`,
      `"${tx.categoryName.replace(/"/g, '""')}"`,
      `"${tx.source || "MANUAL"}"`,
      `"${tx.amount}"`,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const todayStr = getTenantDateString(new Date());
    link.setAttribute("download", `transactions_export_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSort = (column: "recordedAt" | "transactionType" | "description" | "amount") => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection(column === "recordedAt" || column === "amount" ? "desc" : "asc");
    }
  };

  return {
    filterType,
    setFilterType,
    searchQuery,
    setSearchQuery,
    selectedPool,
    setSelectedPool,
    sortColumn,
    sortDirection,
    handleSort,
    page,
    setPage,
    pageSize,
    setPageSize,
    timeframe,
    setTimeframe,
    widths,
    onMouseDown,
    spendingAnalyticsQuery,
    transactionsQuery,
    matchedPool,
    matchedBankAccount,
    isFilterParamInvalid,
    sortedTransactions,
    paginatedTransactions,
    totalPages,
    handleExportCSV,
    fmt,
  };
}
