"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { trpc } from "../../../../lib/trpc";
import { useSubscriptionStatus } from "../../../../hooks/useSubscriptionStatus";
import type { BankAccountItem, BankName, CategoryType } from "../../bank-accounts/components/BankAccountTable";

export function useBankAccountsList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const accountIdParam = searchParams.get("id");
  const { status: subStatus } = useSubscriptionStatus();
  const isTrialExpired = subStatus?.isTrialExpired ?? false;

  const bankAccountsQuery = trpc.getBankAccountsWithMappings.useQuery();
  const poolsQuery = trpc.listPools.useQuery();
  const utils = trpc.useUtils();

  const reconcileMut = trpc.reconcileBankBalance.useMutation();

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccountItem | null>(null);
  const [accName, setAccName] = useState("");
  const [accBankProvider, setAccBankProvider] = useState<BankName>("Other");
  const [accBalance, setAccBalance] = useState("0.00");
  const [accBuffer, setAccBuffer] = useState("0.00");
  const [accIsPrivate, setAccIsPrivate] = useState(false);

  const createAccountMut = trpc.createBankAccount.useMutation({
    onSuccess: () => {
      bankAccountsQuery.refetch();
      closeModal();
    },
    onError: (err: { message: string }) => setErrorMsg(err.message),
  });

  const updateAccountMut = trpc.updateBankAccount.useMutation({
    onSuccess: () => {
      bankAccountsQuery.refetch();
      closeModal();
    },
    onError: (err: { message: string }) => setErrorMsg(err.message),
  });

  const archiveAccountMut = trpc.archiveBankAccount.useMutation({
    onSuccess: () => {
      bankAccountsQuery.refetch();
      setErrorMsg(null);
    },
    onError: (err: { message: string }) => setErrorMsg(err.message),
  });

  // Table Filter & Pagination State
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [sortField, setSortField] = useState<"name" | "lastKnownBalance">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [moveMoneyOpen, setMoveMoneyOpen] = useState(false);

  // Reconciliation State
  const [reconcileState, setReconcileState] = useState<{
    account: BankAccountItem;
    newBalance: number;
    expectedBalance: number;
    unbudgetedBuffer?: number;
    linkedPools: Array<{
      id: string;
      name: string;
      poolType: string;
      currentBalance: number;
    }>;
  } | null>(null);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, typeFilter, sortField, sortDir, pageSize, accountIdParam]);

  const pools = poolsQuery.data ?? [];

  const accounts: BankAccountItem[] = (bankAccountsQuery.data ?? []).map((acc: Record<string, unknown>) => {
    const accId = acc.id as string;
    const linkedPools = pools.filter((p) => p.bankAccountId === accId);
    const poolsTotal = linkedPools.reduce((sum, p) => sum + (p.currentBalance || 0), 0);
    const buf = parseFloat((acc.unbudgetedBuffer as string) || "0.00");
    const expectedBalance = poolsTotal;
    const actualBal = parseFloat((acc.lastKnownBalance as string) || "0.00");
    const availableToBudget = Math.max(0, actualBal - buf);
    const diff = Number((availableToBudget - expectedBalance).toFixed(2));
    const hasDifference = linkedPools.length > 0 && Math.abs(diff) > 0.009;

    return {
      id: accId,
      name: acc.name as string,
      bankProvider: (acc.bankProvider as string) ?? undefined,
      lastKnownBalance: (acc.lastKnownBalance as string) ?? "0.00",
      unbudgetedBuffer: (acc.unbudgetedBuffer as string) ?? "0.00",
      isPrivate: (acc.isPrivate as boolean) ?? false,
      categoryTypes: ((acc.poolTypes || acc.categoryTypes || []) as CategoryType[]),
      updatedAt: (acc.updatedAt as string) ?? undefined,
      expectedBalance,
      hasDifference,
    };
  });

  // Filtering
  const filtered = accounts.filter((acc) => {
    if (accountIdParam && acc.id !== accountIdParam) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = acc.name.toLowerCase().includes(q);
      const matchProvider = (acc.bankProvider || "").toLowerCase().includes(q);
      if (!matchName && !matchProvider) return false;
    }
    if (typeFilter !== "ALL") {
      const hasMatchingPool = pools.some(
        (p) => p.bankAccountId === acc.id && (p.id === typeFilter || p.poolType === typeFilter)
      );
      if (!hasMatchingPool) return false;
    }
    return true;
  });

  // Sorting
  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortField === "name") {
      cmp = a.name.localeCompare(b.name);
    } else {
      const balA = parseFloat(a.lastKnownBalance || "0");
      const balB = parseFloat(b.lastKnownBalance || "0");
      cmp = balA - balB;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  const totalPages = Math.ceil(sorted.length / pageSize) || 1;
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (field: "name" | "lastKnownBalance") => {
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const openAddModal = () => {
    setErrorMsg(null);
    setEditingAccount(null);
    setAccName("");
    setAccBankProvider("Other");
    setAccBalance("0.00");
    setAccBuffer("0.00");
    setAccIsPrivate(false);
    setIsModalOpen(true);
  };

  const openEditModal = (acc: BankAccountItem) => {
    setErrorMsg(null);
    setEditingAccount(acc);
    setAccName(acc.name);
    setAccBankProvider((acc.bankProvider as BankName) || "Other");
    setAccBalance(acc.lastKnownBalance || "0.00");
    setAccBuffer(acc.unbudgetedBuffer || "0.00");
    setAccIsPrivate(Boolean(acc.isPrivate));
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAccount(null);
    setErrorMsg(null);
  };

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accName.trim()) return;

    if (editingAccount) {
      updateAccountMut.mutate({
        accountId: editingAccount.id,
        data: {
          name: accName.trim(),
          bankProvider: accBankProvider,
          lastKnownBalance: parseFloat(accBalance || "0").toFixed(2),
          unbudgetedBuffer: parseFloat(accBuffer || "0").toFixed(2),
          isPrivate: accIsPrivate,
        },
      });
    } else {
      createAccountMut.mutate({
        name: accName.trim(),
        bankProvider: accBankProvider,
        lastKnownBalance: parseFloat(accBalance || "0").toFixed(2),
        unbudgetedBuffer: parseFloat(accBuffer || "0").toFixed(2),
        isPrivate: accIsPrivate,
      });
    }
  };

  const handleArchiveAccount = (acc: BankAccountItem) => {
    archiveAccountMut.mutate({ accountId: acc.id });
  };

  const handleDirectAlignment = (acc: BankAccountItem) => {
    const actualBal = parseFloat(acc.lastKnownBalance || "0");
    const buf = parseFloat(acc.unbudgetedBuffer || "0");
    const linkedPools = pools
      .filter((p) => p.bankAccountId === acc.id)
      .map((p) => ({
        id: p.id,
        name: p.name,
        poolType: p.poolType,
        currentBalance: p.currentBalance || 0,
      }));

    setReconcileState({
      account: acc,
      newBalance: actualBal,
      expectedBalance: acc.expectedBalance ?? 0,
      unbudgetedBuffer: buf,
      linkedPools,
    });
  };

  const handleConfirmReconcile = async (splits: Array<{ poolId: string; adjustment: string }>, reason?: string) => {
    if (!reconcileState) return;
    const { account, newBalance, expectedBalance, unbudgetedBuffer = 0 } = reconcileState;
    const availableToBudget = Math.max(0, newBalance - unbudgetedBuffer);
    const diff = Number((availableToBudget - expectedBalance).toFixed(2));

    if (Math.abs(diff) > 0.009 && splits.length > 0) {
      await reconcileMut.mutateAsync({
        accountId: account.id,
        actualBalance: newBalance.toFixed(2),
        clientIdempotencyToken: crypto.randomUUID(),
        splits,
        note: reason?.trim() || undefined,
      });
    }

    utils.listPools.invalidate();
    await bankAccountsQuery.refetch();
    setReconcileState(null);
    closeModal();
  };

  const matchedAccount = accountIdParam ? accounts.find((a) => a.id === accountIdParam) : null;
  const isAccountParamInvalid = Boolean(accountIdParam && !matchedAccount && !bankAccountsQuery.isLoading);

  return {
    router,
    isTrialExpired,
    bankAccountsQuery,
    pools,
    accounts,
    paginated,
    sorted,
    page,
    totalPages,
    pageSize,
    sortField,
    sortDir,
    toggleSort,
    setPage,
    setPageSize,
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    accountIdParam,
    matchedAccount,
    isAccountParamInvalid,
    errorMsg,
    setErrorMsg,
    isModalOpen,
    editingAccount,
    accName,
    setAccName,
    accBankProvider,
    setAccBankProvider,
    accBalance,
    setAccBalance,
    accBuffer,
    setAccBuffer,
    accIsPrivate,
    setAccIsPrivate,
    openAddModal,
    openEditModal,
    closeModal,
    handleSaveAccount,
    handleArchiveAccount,
    handleDirectAlignment,
    reconcileState,
    setReconcileState,
    handleConfirmReconcile,
    moveMoneyOpen,
    setMoveMoneyOpen,
    isSaving: createAccountMut.isPending || updateAccountMut.isPending,
  };
}
