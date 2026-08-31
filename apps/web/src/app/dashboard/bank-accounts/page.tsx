"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { t } from "@money-matters/i18n";
import { trpc } from "../../../lib/trpc";
import { InfoTooltip, fmtDate, SearchInput, ConfirmDialog } from "@money-matters/ui/web";
import { useSubscriptionStatus } from "../../../hooks/useSubscriptionStatus";

import { BankAccountTable, BankAccountItem, BankName, CategoryType } from "./components/BankAccountTable";
import { BankAccountFormModal } from "./components/BankAccountFormModal";
import { CsvImportModal } from "../../../components/CsvImportModal";
import { ReconciliationModal } from "../../../components/ReconciliationModal";
import { QuickExpenseDrawer } from "../../../components/web/QuickExpenseDrawer";

const BANK_OPTIONS: Array<{ key: BankName; label: string; logoBg: string; textColor: string }> = [
  { key: "CBA", label: "Commonwealth Bank (CBA)", logoBg: "bg-amber-400", textColor: "text-zinc-950" },
  { key: "Westpac", label: "Westpac", logoBg: "bg-red-600", textColor: "text-white" },
  { key: "ANZ", label: "ANZ", logoBg: "bg-blue-600", textColor: "text-white" },
  { key: "NAB", label: "NAB", logoBg: "bg-red-700", textColor: "text-white" },
  { key: "ING", label: "ING", logoBg: "bg-orange-500", textColor: "text-white" },
  { key: "Macquarie", label: "Macquarie", logoBg: "bg-zinc-800", textColor: "text-white" },
  { key: "Other", label: "Other / Custom Bank", logoBg: "bg-slate-500", textColor: "text-white" },
];

function fmtMoney(val: string | number | undefined) {
  const num = typeof val === "string" ? parseFloat(val) : typeof val === "number" ? val : 0;
  return `$${num.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function BankAccountsDashboardContent() {
  const searchParams = useSearchParams();
  const { status: subStatus } = useSubscriptionStatus();
  const isTrialExpired = subStatus?.isTrialExpired ?? false;

  const bankAccountsQuery = trpc.getBankAccountsWithMappings.useQuery();
  const poolsQuery = trpc.listPools.useQuery();
  const csvBatchesQuery = trpc.listCsvImportBatches.useQuery();
  const csvBatches = csvBatchesQuery.data ?? [];

  const reconcileMut = trpc.reconcileBankBalance.useMutation();

  const createAccountMut = trpc.createBankAccount.useMutation({
    onSuccess: () => {
      bankAccountsQuery.refetch();
      closeModal();
    },
  });

  const utils = trpc.useUtils();

  const updateAccountMut = trpc.updateBankAccount.useMutation({
    onSuccess: () => {
      bankAccountsQuery.refetch();
      closeModal();
    },
    onError: (err: { message: string }) => {
      setErrorMsg(err.message);
    },
  });

  const archiveAccountMut = trpc.archiveBankAccount.useMutation({
    onSuccess: () => {
      bankAccountsQuery.refetch();
      setErrorMsg(null);
    },
    onError: (err: { message: string }) => {
      setErrorMsg(err.message);
    },
  });

  // State management
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [sortField, setSortField] = useState<"name" | "lastKnownBalance">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Add / Edit Account Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccountItem | null>(null);
  const [accName, setAccName] = useState("");
  const [accBankProvider, setAccBankProvider] = useState<BankName>("CBA");
  const [accBalance, setAccBalance] = useState("0.00");
  const [accBuffer, setAccBuffer] = useState("0.00");
  const [accIsPrivate, setAccIsPrivate] = useState(false);

  // CSV Import Modal & Rollback State
  const [selectedAccountForImport, setSelectedAccountForImport] = useState<BankAccountItem | null>(null);

  const [rollbackMsg, setRollbackMsg] = useState<string | null>(null);
  const [showRollbackSection, setShowRollbackSection] = useState(false);

  const rollbackBatchMut = trpc.rollbackCsvBatch.useMutation({
    onSuccess: (res) => {
      setRollbackMsg(`✓ Successfully archived ${res.rolledBackCount} imported transactions!`);
      bankAccountsQuery.refetch();
      utils.listCsvImportBatches.invalidate();
      utils.listTransactions.invalidate();
    },
    onError: (err) => {
      setRollbackMsg(`Rollback Failed: ${err.message}`);
    },
  });

  useEffect(() => {
    setPage(1);
  }, [searchQuery, typeFilter, sortField, sortDir, pageSize]);

  const [moveMoneyOpen, setMoveMoneyOpen] = useState(false);
  const pools = poolsQuery.data ?? [];

  const accounts: BankAccountItem[] = (bankAccountsQuery.data ?? []).map((acc: Record<string, unknown>) => {
    const accId = acc.id as string;
    const linkedPools = pools.filter((p) => p.bankAccountId === accId);
    const poolsTotal = linkedPools.reduce((sum, p) => sum + (p.currentBalance || 0), 0);
    const buf = parseFloat((acc.unbudgetedBuffer as string) || "0.00");
    const expectedBalance = poolsTotal + buf;
    const actualBal = parseFloat((acc.lastKnownBalance as string) || "0.00");
    const diff = Number((actualBal - expectedBalance).toFixed(2));
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
      differenceAmount: diff,
      linkedPoolsCount: linkedPools.length,
      linkedPools: linkedPools.map((p) => ({
        id: p.id,
        name: p.name,
        poolType: p.poolType,
        currentBalance: p.currentBalance || 0,
      })),
    };
  });

  // Filter accounts
  const filtered = accounts.filter((acc) => {
    if (!acc || !acc.name) return false;
    const q = searchQuery.toLowerCase().trim();
    if (q && !acc.name.toLowerCase().includes(q)) return false;
    if (typeFilter !== "ALL") {
      if (typeFilter === "UNLINKED") {
        if ((acc.linkedPoolsCount ?? 0) > 0) return false;
      } else {
        if (!acc.linkedPools?.some((p) => p.id === typeFilter)) return false;
      }
    }
    return true;
  });

  // Sort accounts
  const sorted = [...filtered].sort((a, b) => {
    let comp = 0;
    if (sortField === "name") {
      comp = a.name.localeCompare(b.name);
    } else if (sortField === "lastKnownBalance") {
      comp = parseFloat(a.lastKnownBalance || "0") - parseFloat(b.lastKnownBalance || "0");
    }
    return sortDir === "asc" ? comp : -comp;
  });

  const totalPages = Math.ceil(sorted.length / pageSize) || 1;
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (field: "name" | "lastKnownBalance") => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const [selectedPoolIds, setSelectedPoolIds] = useState<string[]>([]);

  const handlePoolToggle = (poolId: string) => {
    if (selectedPoolIds.includes(poolId)) {
      setSelectedPoolIds(selectedPoolIds.filter((id) => id !== poolId));
    } else {
      setSelectedPoolIds([...selectedPoolIds, poolId]);
    }
  };

  const openAddModal = () => {
    setEditingAccount(null);
    setAccName("");
    setAccBankProvider("CBA");
    setAccBalance("0.00");
    setAccBuffer("0.00");
    setAccIsPrivate(false);
    setSelectedPoolIds([]);
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const openEditModal = (acc: BankAccountItem) => {
    setEditingAccount(acc);
    setAccName(acc.name);
    setAccBankProvider(
      acc.bankProvider && (BANK_OPTIONS.some(b => b.key === acc.bankProvider))
        ? (acc.bankProvider as BankName)
        : "CBA"
    );
    setAccBalance(acc.lastKnownBalance || "0.00");
    setAccBuffer(acc.unbudgetedBuffer || "0.00");
    setAccIsPrivate(acc.isPrivate ?? false);
    setSelectedPoolIds(pools.filter(p => p.bankAccountId === acc.id).map(p => p.id));
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const [reconcileState, setReconcileState] = useState<{
    account: BankAccountItem;
    newBalance: number;
    expectedBalance: number;
    linkedPools: Array<{ id: string; name: string; poolType: string; currentBalance: number; isSurplusTarget?: boolean }>;
  } | null>(null);

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAccount(null);
    setErrorMsg(null);
  };

  const handleDirectAlignment = (acc: BankAccountItem) => {
    const linkedPools = pools.filter((p) => p.bankAccountId === acc.id);
    const poolsTotal = linkedPools.reduce((sum, p) => sum + (p.currentBalance || 0), 0);
    const buf = parseFloat(acc.unbudgetedBuffer || "0.00");
    const expectedBankBal = poolsTotal + buf;
    const actualBal = parseFloat(acc.lastKnownBalance || "0.00");

    setReconcileState({
      account: acc,
      newBalance: actualBal,
      expectedBalance: expectedBankBal,
      linkedPools,
    });
  };

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accName.trim()) return;

    const balNum = parseFloat(accBalance) || 0;
    const bufNum = parseFloat(accBuffer) || 0;

    if (bufNum > balNum) {
      setErrorMsg("Unbudgeted Buffer / Reserved amount cannot exceed the Current Balance.");
      return;
    }

    const linkedPools = pools.filter((p) => selectedPoolIds.includes(p.id));
    const poolsTotal = linkedPools.reduce((sum, p) => sum + (p.currentBalance || 0), 0);
    const expectedBankBal = poolsTotal + bufNum;

    // RULE: If pools are linked and balance differs, trigger alignment modal
    if (linkedPools.length > 0 && Math.abs(balNum - expectedBankBal) > 0.009) {
      setIsModalOpen(false); // Close edit form modal cleanly!
      setReconcileState({
        account: editingAccount || {
          id: "new-account",
          name: accName.trim(),
        },
        newBalance: balNum,
        expectedBalance: expectedBankBal,
        linkedPools,
      });
      return;
    }

    if (editingAccount) {
      updateAccountMut.mutate({
        accountId: editingAccount.id,
        data: {
          name: accName.trim(),
          bankProvider: accBankProvider,
          lastKnownBalance: accBalance.trim() || "0.00",
          unbudgetedBuffer: accBuffer.trim() || "0.00",
          isPrivate: accIsPrivate,
        },
      });
    } else {
      createAccountMut.mutate({
        name: accName.trim(),
        bankProvider: accBankProvider,
        lastKnownBalance: accBalance.trim() || "0.00",
        unbudgetedBuffer: accBuffer.trim() || "0.00",
        isPrivate: accIsPrivate,
      });
    }
  };

  const handleConfirmReconcile = async (splits: Array<{ poolId: string; adjustment: string }>) => {
    if (!reconcileState) return;
    const { account, newBalance, expectedBalance } = reconcileState;
    const diff = Number((newBalance - expectedBalance).toFixed(2));

    if (Math.abs(diff) > 0.009 && splits.length > 0) {
      await reconcileMut.mutateAsync({
        accountId: account.id,
        actualBalance: newBalance.toFixed(2),
        clientIdempotencyToken: crypto.randomUUID(),
        splits,
      });
    }

    const currentAccName = editingAccount?.id === account.id ? accName.trim() : account.name;
    const currentProvider = editingAccount?.id === account.id ? accBankProvider : (account.bankProvider as BankName);
    const currentBuffer = editingAccount?.id === account.id ? (accBuffer.trim() || "0.00") : (account.unbudgetedBuffer || "0.00");
    const currentIsPrivate = editingAccount?.id === account.id ? accIsPrivate : (account.isPrivate ?? false);

    await updateAccountMut.mutateAsync({
      accountId: account.id,
      data: {
        name: currentAccName,
        bankProvider: currentProvider,
        lastKnownBalance: newBalance.toFixed(2),
        unbudgetedBuffer: currentBuffer,
        isPrivate: currentIsPrivate,
      },
    });

    utils.listPools.invalidate();
    bankAccountsQuery.refetch();
    setReconcileState(null);
    closeModal();
  };

  const [accountToArchive, setAccountToArchive] = useState<BankAccountItem | null>(null);
  const [batchToRollback, setBatchToRollback] = useState<{ batchId: string; rowCount: number } | null>(null);

  const handleArchive = (acc: BankAccountItem) => {
    const catTypes = acc.categoryTypes || [];
    if (catTypes.length > 0) {
      setErrorMsg(
        `Cannot archive account "${acc.name}" because it has category type(s) linked to it (${catTypes.join(", ")}). Re-assign these category types first.`
      );
      return;
    }
    setAccountToArchive(acc);
  };

  const confirmArchiveAccount = () => {
    if (!accountToArchive) return;
    archiveAccountMut.mutate({ accountId: accountToArchive.id });
    setAccountToArchive(null);
  };

  const confirmRollbackBatch = () => {
    if (!batchToRollback) return;
    rollbackBatchMut.mutate({ batchId: batchToRollback.batchId });
    setBatchToRollback(null);
  };

  const openImportModal = (acc: BankAccountItem) => {
    setSelectedAccountForImport(acc);
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-16 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#1B2B4B] flex items-center gap-2">
            <span>{t("bankAccounts.title") || "Bank Accounts"}</span>
            <InfoTooltip
              title={t("tooltips.bankAccounts.title")}
              content={t("tooltips.bankAccounts.content")}
            />
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowRollbackSection(!showRollbackSection)}
            className="px-3.5 py-2.5 rounded-xl font-bold text-xs text-slate-700 bg-white border border-zinc-300 hover:bg-zinc-50 transition-all flex items-center gap-1.5 shadow-2xs"
          >
            <span>📄</span>
            <span>CSV Imports Log ({csvBatches.length})</span>
          </button>
          <button
            type="button"
            onClick={openAddModal}
            className="px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-[#2563eb] hover:bg-blue-700 transition-all shadow-md flex items-center gap-2"
          >
            <span>➕</span>
            <span>Add Bank Account</span>
          </button>
        </div>
      </div>

      {rollbackMsg && (
        <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-xs font-semibold flex items-center justify-between shadow-xs">
          <span>{rollbackMsg}</span>
          <button onClick={() => setRollbackMsg(null)} className="text-teal-600 hover:text-teal-800 font-bold ml-2">
            ✕
          </button>
        </div>
      )}

      {showRollbackSection && (
        <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs flex flex-col gap-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-amber-900 flex items-center gap-1.5">
              <span>📄</span>
              <span>Recent CSV Statement Imports</span>
            </span>
            <span className="text-[11px] text-amber-700 font-medium">
              Archiving a batch removes its transactions from all calculations and balances.
            </span>
          </div>

          {csvBatches.length === 0 ? (
            <p className="text-zinc-500 italic py-2">No active CSV statement imports found.</p>
          ) : (
            <div className="divide-y divide-amber-200/60 bg-white rounded-xl border border-amber-200/80 overflow-hidden">
              {csvBatches.map((batch) => (
                <div key={batch.batchId} className="p-3 flex flex-wrap items-center justify-between gap-3 hover:bg-amber-50/30 transition-colors">
                  <div className="flex flex-col">
                    <span className="font-bold text-[#1B2B4B]">{batch.bankAccountName}</span>
                    <span className="text-[10px] text-zinc-400 font-medium">
                      Imported {fmtDate(batch.importedAt)} • {batch.rowCount} transactions
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-black text-zinc-800">
                      Total: ${batch.totalAmount}
                    </span>
                    <button
                      type="button"
                      disabled={rollbackBatchMut.isPending}
                      onClick={() => setBatchToRollback({ batchId: batch.batchId, rowCount: batch.rowCount })}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors shadow-2xs cursor-pointer"
                    >
                      Archive Batch
                    </button>

                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center justify-between shadow-xs">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-800 font-bold ml-2">
            ✕
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-zinc-200 shadow-xs">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search bank accounts by name..."
        />

        <div className="flex items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 text-xs font-bold rounded-xl border border-zinc-200 bg-white text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
          >
            <option value="ALL">All Accounts</option>
            {pools.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
            <option value="UNLINKED">Unlinked Accounts</option>
          </select>
        </div>
      </div>

      {/* Primary Bank Accounts Table */}
      <BankAccountTable
        accounts={paginated}
        page={page}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={sorted.length}
        sortField={sortField}
        sortDir={sortDir}
        toggleSort={toggleSort}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        openEditModal={openEditModal}
        openImportModal={openImportModal}
        openAlignmentModal={handleDirectAlignment}
        fmtMoney={fmtMoney}
        isLoading={bankAccountsQuery.isLoading}
      />


      {/* Add / Edit Account Modal */}
      {isModalOpen && (
        <BankAccountFormModal
          isOpen={isModalOpen}
          editingAccount={editingAccount}
          accName={accName}
          setAccName={setAccName}
          accBankProvider={accBankProvider}
          setAccBankProvider={setAccBankProvider}
          accBalance={accBalance}
          setAccBalance={setAccBalance}
          accBuffer={accBuffer}
          setAccBuffer={setAccBuffer}
          accIsPrivate={accIsPrivate}
          setAccIsPrivate={setAccIsPrivate}
          pools={pools}
          selectedPoolIds={selectedPoolIds}
          onPoolToggle={handlePoolToggle}
          accounts={accounts}
          isTrialExpired={isTrialExpired}
          isSaving={createAccountMut.isPending || updateAccountMut.isPending}
          bankOptions={BANK_OPTIONS}
          onClose={closeModal}
          onSubmit={handleSaveAccount}
          fmtMoney={fmtMoney}
          onArchive={() => editingAccount && handleArchive(editingAccount)}
          errorMsg={errorMsg}
        />
      )}

      {/* Balance Alignment Modal */}
      {reconcileState && (
        <ReconciliationModal
          isOpen={!!reconcileState}
          onClose={() => setReconcileState(null)}
          accountName={reconcileState.account.name}
          expectedBalance={reconcileState.expectedBalance}
          newBalance={reconcileState.newBalance}
          pools={reconcileState.linkedPools}
          onConfirm={handleConfirmReconcile}
          onOpenTransferModal={() => setMoveMoneyOpen(true)}
        />
      )}

      {/* Quick Action Drawer for Transfer capability */}
      {moveMoneyOpen && (
        <QuickExpenseDrawer
          onClose={() => {
            setMoveMoneyOpen(false);
            utils.listPools.invalidate();
          }}
          initialTab="TRANSFER"
        />
      )}

      {/* Bank Account Selected CSV Import Modal */}
      {selectedAccountForImport && (
        <CsvImportModal
          isOpen={!!selectedAccountForImport}
          bankAccountId={selectedAccountForImport.id}
          onClose={() => setSelectedAccountForImport(null)}
          onSuccess={() => bankAccountsQuery.refetch()}
        />
      )}

      <ConfirmDialog
        isOpen={!!accountToArchive}
        onClose={() => setAccountToArchive(null)}
        onConfirm={confirmArchiveAccount}
        title="Archive Bank Account"
        description={`Are you sure you want to archive bank account "${accountToArchive?.name || ""}"?`}
        confirmLabel="Archive Account"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={!!batchToRollback}
        onClose={() => setBatchToRollback(null)}
        onConfirm={confirmRollbackBatch}
        title="Archive CSV Import Batch"
        description={`Are you sure you want to archive this CSV import batch (${batchToRollback?.rowCount || 0} transactions)?`}
        confirmLabel="Archive Batch"
        variant="warning"
      />
    </div>
  );
}

export default function BankAccountsDashboardPage() {
  return (
    <Suspense fallback={null}>
      <BankAccountsDashboardContent />
    </Suspense>
  );
}

