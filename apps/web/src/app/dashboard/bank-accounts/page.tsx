"use client";

import React, { useState, useEffect } from "react";
import { trpc } from "../../../lib/trpc";
import { InfoTooltip, PaginationBar } from "@money-matters/ui/web";
import { useSubscriptionStatus } from "../../../hooks/useSubscriptionStatus";
import { CsvImportModal } from "../../../components/CsvImportModal";
import { BankAccountFormModal } from "./components/BankAccountFormModal";

type BankName = "CBA" | "Westpac" | "ANZ" | "NAB" | "ING" | "Macquarie" | "Other";
type CategoryType = "EVERYDAY" | "REGULAR" | "GOAL";

interface BankAccountItem {
  id: string;
  name: string;
  bankProvider?: BankName;
  lastKnownBalance?: string;
  unbudgetedBuffer?: string;
  isPrivate?: boolean;
  categoryTypes: CategoryType[];
  updatedAt?: string | Date;
}

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

export default function BankAccountsDashboardPage() {
  const { status: subStatus } = useSubscriptionStatus();
  const isTrialExpired = subStatus?.isTrialExpired ?? false;

  const bankAccountsQuery = trpc.getBankAccountsWithMappings.useQuery();
  
  const updateMappingsMut = trpc.updateBankAccountMappings.useMutation({
    onSuccess: () => bankAccountsQuery.refetch(),
  });

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
  const [searchQuery, setSearchQuery] = useState("");
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
  const [accSelectedTypes, setAccSelectedTypes] = useState<Array<"EVERYDAY" | "REGULAR" | "GOAL">>([]);

  // CSV Import Modal & Rollback State
  const [selectedAccountForImport, setSelectedAccountForImport] = useState<BankAccountItem | null>(null);
  const [conflictModalInfo, setConflictModalInfo] = useState<{
    type: "EVERYDAY" | "REGULAR" | "GOAL";
    typeLabel: string;
    previousOwnerName: string;
  } | null>(null);

  const [rollbackBatchId, setRollbackBatchId] = useState("");
  const [rollbackMsg, setRollbackMsg] = useState<string | null>(null);
  const [showRollbackSection, setShowRollbackSection] = useState(false);

  const rollbackBatchMut = trpc.rollbackCsvBatch.useMutation({
    onSuccess: (res) => {
      setRollbackMsg(`✓ Successfully rolled back ${res.rolledBackCount} imported transactions!`);
      setRollbackBatchId("");
      bankAccountsQuery.refetch();
      utils.listTransactions.invalidate();
    },
    onError: (err) => {
      setRollbackMsg(`Rollback Failed: ${err.message}`);
    },
  });

  useEffect(() => {
    setPage(1);
  }, [searchQuery, typeFilter, sortField, sortDir, pageSize]);

  const accounts = (bankAccountsQuery.data as BankAccountItem[]) || [];

  // Filter accounts
  const filtered = accounts.filter((acc) => {
    if (!acc || !acc.name) return false;
    const q = searchQuery.toLowerCase().trim();
    if (q && !acc.name.toLowerCase().includes(q)) return false;
    if (typeFilter !== "ALL") {
      const catTypes = acc.categoryTypes || [];
      if (typeFilter === "UNLINKED" && catTypes.length > 0) return false;
      if (typeFilter !== "UNLINKED" && !catTypes.includes(typeFilter as CategoryType)) return false;
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

  const openAddModal = () => {
    setEditingAccount(null);
    setAccName("");
    setAccBankProvider("CBA");
    setAccBalance("0.00");
    setAccBuffer("0.00");
    setAccIsPrivate(false);
    setAccSelectedTypes([]);
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const openEditModal = (acc: BankAccountItem) => {
    setEditingAccount(acc);
    setAccName(acc.name);
    setAccBankProvider(acc.bankProvider || "CBA");
    setAccBalance(acc.lastKnownBalance || "0.00");
    setAccBuffer(acc.unbudgetedBuffer || "0.00");
    setAccIsPrivate(acc.isPrivate ?? false);
    setAccSelectedTypes(acc.categoryTypes);
    setErrorMsg(null);
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

    const balNum = parseFloat(accBalance) || 0;
    const bufNum = parseFloat(accBuffer) || 0;

    if (bufNum > balNum) {
      setErrorMsg("Unbudgeted Buffer / Earmarked amount cannot exceed the Current Balance.");
      return;
    }

    if (editingAccount) {
      updateAccountMut.mutate(
        {
          accountId: editingAccount.id,
          data: {
            name: accName.trim(),
            bankProvider: accBankProvider,
            lastKnownBalance: accBalance.trim() || "0.00",
            unbudgetedBuffer: accBuffer.trim() || "0.00",
            isPrivate: accIsPrivate && !isTrialExpired,
          },
        },
        {
          onSuccess: () => {
            updateMappingsForAccount(editingAccount.id, accSelectedTypes);
          },
        }
      );
    } else {
      createAccountMut.mutate(
        {
          name: accName.trim(),
          bankProvider: accBankProvider,
          lastKnownBalance: accBalance.trim() || "0.00",
          unbudgetedBuffer: accBuffer.trim() || "0.00",
          isPrivate: accIsPrivate && !isTrialExpired,
        },
        {
          onSuccess: (newAcc) => {
            if (newAcc && newAcc.id) {
              updateMappingsForAccount(newAcc.id, accSelectedTypes);
            }
          },
        }
      );
    }
  };

  const updateMappingsForAccount = (targetAccountId: string, selectedTypes: Array<"EVERYDAY" | "REGULAR" | "GOAL">) => {
    const allTypes: Array<"EVERYDAY" | "REGULAR" | "GOAL"> = ["EVERYDAY", "REGULAR", "GOAL"];
    const updatedMappings: Array<{ categoryType: "EVERYDAY" | "REGULAR" | "GOAL"; bankAccountId: string }> = [];

    for (const tType of allTypes) {
      if (selectedTypes.includes(tType)) {
        updatedMappings.push({ categoryType: tType, bankAccountId: targetAccountId });
      } else {
        const existingOwner = accounts.find((a) => a.id !== targetAccountId && a.categoryTypes.includes(tType));
        if (existingOwner) {
          updatedMappings.push({ categoryType: tType, bankAccountId: existingOwner.id });
        }
      }
    }

    if (updatedMappings.length > 0) {
      updateMappingsMut.mutate({ mappings: updatedMappings });
    }
  };

  const handleCategoryTypeToggle = (type: "EVERYDAY" | "REGULAR" | "GOAL") => {
    if (accSelectedTypes.includes(type)) {
      setAccSelectedTypes(accSelectedTypes.filter((t) => t !== type));
    } else {
      const currentOwner = accounts.find((a) => a.id !== editingAccount?.id && a.categoryTypes.includes(type));
      if (currentOwner) {
        const labelMap: Record<"EVERYDAY" | "REGULAR" | "GOAL", string> = {
          EVERYDAY: "Everyday Pool",
          REGULAR: "Bills Pool",
          GOAL: "Goal Pool",
        };
        setConflictModalInfo({
          type,
          typeLabel: labelMap[type],
          previousOwnerName: currentOwner.name,
        });
      } else {
        setAccSelectedTypes([...accSelectedTypes, type]);
      }
    }
  };

  const confirmConflictTransfer = () => {
    if (conflictModalInfo) {
      setAccSelectedTypes([...accSelectedTypes, conflictModalInfo.type]);
      setConflictModalInfo(null);
    }
  };

  const handleArchive = (acc: BankAccountItem) => {
    if (acc.categoryTypes.length > 0) {
      setErrorMsg(
        `Cannot archive account "${acc.name}" because it has category type(s) linked to it (${acc.categoryTypes.join(", ")}). Re-assign these category types first.`
      );
      return;
    }

    if (confirm(`Are you sure you want to archive bank account "${acc.name}"?`)) {
      archiveAccountMut.mutate({ accountId: acc.id });
    }
  };
  const openImportModal = (acc: BankAccountItem) => {
    setSelectedAccountForImport(acc);
  };

  const handleExecuteRollback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rollbackBatchId.trim()) return;
    rollbackBatchMut.mutate({ batchId: rollbackBatchId.trim() });
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-16 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#1B2B4B] flex items-center gap-2">
            <span>🏦</span>
            <span>Bank Accounts & Pools</span>
          </h1>
          <p className="text-xs text-zinc-500 font-medium mt-1">
            Connect and map your bank accounts directly to target liquidity pools (Everyday, Bills, Savings).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowRollbackSection(!showRollbackSection)}
            className="px-3.5 py-2.5 rounded-xl font-bold text-xs text-slate-700 bg-white border border-zinc-300 hover:bg-zinc-50 transition-all flex items-center gap-1.5"
          >
            <span>↩️</span>
            <span>Undo CSV Batch</span>
          </button>
          <button
            type="button"
            onClick={openAddModal}
            className="px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-[#00B4A6] hover:opacity-90 transition-all shadow-md flex items-center gap-2"
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
        <form onSubmit={handleExecuteRollback} className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs flex flex-wrap items-center gap-3 animate-in fade-in duration-150">
          <div className="flex items-center gap-2 flex-1 min-w-[280px]">
            <span className="font-bold text-amber-900 shrink-0">↩️ Rollback CSV Batch ID:</span>
            <input
              type="text"
              value={rollbackBatchId}
              onChange={(e) => setRollbackBatchId(e.target.value)}
              placeholder="Paste batch UUID (e.g. 3eaaea7e-1c9f-4cad)..."
              className="flex-1 px-3 py-2 rounded-xl border border-amber-300 bg-white font-mono text-xs focus:ring-2 focus:ring-amber-500"
              required
            />
          </div>
          <button
            type="submit"
            disabled={rollbackBatchMut.isPending}
            className="px-4 py-2 rounded-xl font-bold text-white bg-amber-700 hover:bg-amber-800 transition-colors shadow-xs"
          >
            {rollbackBatchMut.isPending ? "Rolling Back..." : "Soft-Delete Batch"}
          </button>
        </form>
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
        <div className="flex-1 min-w-[240px] relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search bank accounts by name..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6] bg-zinc-50/50"
          />
          <svg className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-zinc-400">Linked Pool:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 text-xs font-bold rounded-xl border border-zinc-200 bg-white text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
          >
            <option value="ALL">All Accounts</option>
            <option value="EVERYDAY">Everyday Pool</option>
            <option value="REGULAR">Bills Pool</option>
            <option value="GOAL">Savings Pool</option>
            <option value="UNLINKED">Unlinked</option>
          </select>
        </div>
      </div>

      {/* Primary Bank Accounts Table */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/70 text-zinc-500 font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4 cursor-pointer hover:text-zinc-800 transition-colors" onClick={() => toggleSort("name")}>
                  <div className="flex items-center gap-1">
                    <span>Account Details</span>
                    {sortField === "name" && <span>{sortDir === "asc" ? "▲" : "▼"}</span>}
                  </div>
                </th>
                <th className="py-3.5 px-4 cursor-pointer hover:text-zinc-800 transition-colors" onClick={() => toggleSort("lastKnownBalance")}>
                  <div className="flex items-center gap-1">
                    <span>Available Balance</span>
                    <InfoTooltip content="Amount available to budget (Actual Balance minus Earmarked/Unbudgeted Buffer)." />
                    {sortField === "lastKnownBalance" && <span>{sortDir === "asc" ? "▲" : "▼"}</span>}
                  </div>
                </th>
                <th className="py-3.5 px-4">
                  <div className="flex items-center gap-1">
                    <span>Linked Category Types</span>
                    <InfoTooltip content="Category pools linked to this bank account for waterfall payday distribution." />
                  </div>
                </th>
                <th className="py-3.5 px-4">Account Type</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 font-medium text-zinc-800">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-400">
                    No bank accounts found matching your search.
                  </td>
                </tr>
              ) : (
                paginated.map((acc) => {
                  const actualBal = parseFloat(acc.lastKnownBalance || "0");
                  const buf = parseFloat(acc.unbudgetedBuffer || "0");
                  const availBal = Math.max(0, actualBal - buf);

                  return (
                    <tr key={acc.id} className="hover:bg-zinc-50/80 transition-colors group">
                      <td className="py-4 px-4 font-bold text-[#1B2B4B]">
                        <p className="text-sm font-bold text-[#1B2B4B]">{acc.name}</p>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-emerald-600">{fmtMoney(availBal)}</span>
                          <span className="text-[10px] text-zinc-400 font-medium">
                            Actual Balance: {fmtMoney(actualBal)}
                            {buf > 0 && ` (Earmarked: ${fmtMoney(buf)})`}
                          </span>
                        </div>
                      </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {acc.categoryTypes.length === 0 ? (
                          <span className="text-[10px] font-semibold text-zinc-400 italic">None linked</span>
                        ) : (
                          acc.categoryTypes.map((type) => {
                            const badgeStyle =
                              type === "EVERYDAY"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : type === "REGULAR"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-indigo-50 text-indigo-700 border-indigo-200";
                            return (
                              <span
                                key={type}
                                className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${badgeStyle}`}
                              >
                                {type === "EVERYDAY" ? "Everyday" : type === "REGULAR" ? "Bills" : "Goal"}
                              </span>
                            );
                          })
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {acc.isPrivate ? (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          🔒 Private
                        </span>
                      ) : (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-teal-50 text-[#00B4A6] border border-teal-200">
                          👥 Household
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(acc)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-zinc-700 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 transition-all"
                          title="Edit Account Details"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => openImportModal(acc)}
                          className="px-2.5 py-1.5 text-xs font-bold rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 transition-colors flex items-center gap-1"
                          title="Import CSV Statement for this account"
                        >
                          <span>📄</span>
                          <span>Import CSV</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleArchive(acc)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 transition-all"
                          title={acc.categoryTypes.length > 0 ? "Cannot archive (category types linked)" : "Archive Account"}
                        >
                          Archive
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <PaginationBar
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={sorted.length}
          pageSizeOptions={[10, 25, 50]}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </div>

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
          accSelectedTypes={accSelectedTypes}
          accounts={accounts}
          isTrialExpired={isTrialExpired}
          isSaving={createAccountMut.isPending || updateAccountMut.isPending}
          bankOptions={BANK_OPTIONS}
          onClose={closeModal}
          onSubmit={handleSaveAccount}
          onCategoryTypeToggle={handleCategoryTypeToggle}
          fmtMoney={fmtMoney}
        />
      )}

      {/* Conflict Transfer Warning Modal */}
      {conflictModalInfo && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full border border-amber-200 shadow-xl space-y-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center text-xl">
              ⚠️
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-[#1B2B4B]">Link Category Transfer Warning</h4>
              <p className="text-xs text-zinc-600 leading-relaxed">
                <strong>{conflictModalInfo.typeLabel}</strong> is currently linked to <strong>{conflictModalInfo.previousOwnerName}</strong>.
              </p>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Linking it to <strong>{accName || "this account"}</strong> will automatically unlink it from <strong>{conflictModalInfo.previousOwnerName}</strong> when you save.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setConflictModalInfo(null)}
                className="px-3.5 py-2 text-xs font-bold text-zinc-600 rounded-xl hover:bg-zinc-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmConflictTransfer}
                className="px-3.5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition-colors"
              >
                Confirm Transfer
              </button>
            </div>
          </div>
        </div>
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
    </div>
  );
}
