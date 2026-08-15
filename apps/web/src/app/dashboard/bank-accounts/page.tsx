"use client";

import React, { useState, useEffect } from "react";
import { trpc } from "../../../lib/trpc";
import { Spinner, InfoTooltip, PaginationBar } from "@money-matters/ui/web";
import { useSubscriptionStatus } from "../../../hooks/useSubscriptionStatus";

type BankName = "CBA" | "Westpac" | "ANZ" | "NAB" | "ING" | "Macquarie" | "Other";
type CategoryType = "EVERYDAY" | "REGULAR" | "GOAL";

interface BankAccountItem {
  id: string;
  name: string;
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

  // CSV Import Drawer / Modal State
  const [selectedAccountForImport, setSelectedAccountForImport] = useState<BankAccountItem | null>(null);
  const [selectedBankProvider, setSelectedBankProvider] = useState<BankName>("CBA");
  const [showImportGuide, setShowImportGuide] = useState(false);
  const [csvResultMsg, setCsvResultMsg] = useState<string | null>(null);
  const [showCustomMapper, setShowCustomMapper] = useState(false);
  const [pendingCsvText, setPendingCsvText] = useState<string>("");
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [dateCol, setDateCol] = useState(0);
  const [descCol, setDescCol] = useState(1);
  const [amountCol, setAmountCol] = useState(2);

  const parseCsvMut = trpc.parseCsv.useMutation({
    onSuccess: (res: { bank: string; transactions: Array<{ date: string; description: string; amount: string; flowType: "DEBIT" | "CREDIT" }>; headers: string[] }) => {
      if (res.transactions.length === 0 && res.headers.length > 0 && !showCustomMapper) {
        setRawHeaders(res.headers);
        setShowCustomMapper(true);
        setCsvResultMsg("Unrecognised format. Please map columns manually below.");
      } else {
        setShowCustomMapper(false);
        setCsvResultMsg(`Successfully parsed ${res.transactions.length} transactions for ${selectedAccountForImport?.name} using ${selectedBankProvider} format!`);
      }
    },
    onError: (err: { message: string }) => {
      setCsvResultMsg(`CSV Parse Error: ${err.message}`);
    },
  });

  useEffect(() => {
    setPage(1);
  }, [searchQuery, typeFilter, sortField, sortDir, pageSize]);

  if (bankAccountsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center p-16">
        <Spinner size="lg" label="Loading bank accounts..." />
      </div>
    );
  }

  const accounts = (bankAccountsQuery.data as BankAccountItem[]) || [];

  // Filter accounts
  const filtered = accounts.filter((acc) => {
    const q = searchQuery.toLowerCase().trim();
    if (q && !acc.name.toLowerCase().includes(q)) return false;
    if (typeFilter !== "ALL") {
      if (typeFilter === "UNLINKED" && acc.categoryTypes.length > 0) return false;
      if (typeFilter !== "UNLINKED" && !acc.categoryTypes.includes(typeFilter as CategoryType)) return false;
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
    setAccBankProvider("CBA");
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
      setAccSelectedTypes([...accSelectedTypes, type]);
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
    setSelectedBankProvider("CBA");
    setCsvResultMsg(null);
    setShowCustomMapper(false);
    setPendingCsvText("");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvResultMsg(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setPendingCsvText(text);
        parseCsvMut.mutate({ csvText: text });
      }
    };
    reader.readAsText(file);
  };

  const handleApplyCustomMapping = () => {
    if (!pendingCsvText) return;
    parseCsvMut.mutate({
      csvText: pendingCsvText,
      customMapping: {
        dateColIndex: dateCol,
        descColIndex: descCol,
        amountColIndex: amountCol,
      },
    });
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-16 animate-in fade-in duration-200">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#1B2B4B] tracking-tight">Bank Accounts</h1>
          <p className="text-xs text-zinc-500 font-semibold mt-0.5">
            Manage your accounts, linked category pools, and CSV statement imports.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-[#00B4A6] hover:opacity-90 transition-all shadow-md flex items-center gap-2"
        >
          <span>➕</span>
          <span>Add Bank Account</span>
        </button>
      </div>

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
                                {type === "EVERYDAY" ? "Everyday" : type === "REGULAR" ? "Bills" : "Savings Goal"}
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
                          onClick={() => openImportModal(acc)}
                          className="px-2.5 py-1.5 text-xs font-bold rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 transition-colors flex items-center gap-1"
                          title="Import CSV Statement for this account"
                        >
                          <span>📄</span>
                          <span>Import CSV</span>
                        </button>
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <form
            onSubmit={handleSaveAccount}
            className="bg-white rounded-2xl p-6 max-w-md w-full flex flex-col gap-4 shadow-xl border border-zinc-100"
          >
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="text-base font-bold text-[#1B2B4B]">
                {editingAccount ? "Edit Bank Account" : "Add New Bank Account"}
              </h3>
              <button type="button" onClick={closeModal} className="text-zinc-400 hover:text-zinc-600 font-bold">
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1">
                <label className="text-xs font-bold text-zinc-700">Bank Institution</label>
                <InfoTooltip content="Select the Australian bank or financial institution for this account." />
              </div>
              <select
                value={accBankProvider}
                onChange={(e) => setAccBankProvider(e.target.value as BankName)}
                className="px-3 py-2 text-xs font-medium rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6] bg-white"
              >
                {BANK_OPTIONS.map((b) => (
                  <option key={b.key} value={b.key}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-zinc-700">Account Name</label>
              <input
                type="text"
                value={accName}
                onChange={(e) => setAccName(e.target.value)}
                placeholder="e.g. Smart Access Savings"
                className="px-3 py-2 text-xs font-medium rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
                required
              />
            </div>

            {/* Separate Rows for Current Balance & Unbudgeted Buffer */}
            <div className="flex flex-col gap-3 p-3.5 bg-zinc-50/80 rounded-2xl border border-zinc-200/80">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1">
                  <label className="text-xs font-bold text-zinc-700">Current Balance ($)</label>
                  <InfoTooltip content="Total actual funds currently in this bank account." />
                </div>
                <input
                  type="number"
                  step="0.01"
                  value={accBalance}
                  onChange={(e) => setAccBalance(e.target.value)}
                  className="px-3 py-2 text-xs font-bold rounded-xl border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1">
                  <label className="text-xs font-bold text-zinc-700">Unbudgeted Buffer / Earmarked Funds ($)</label>
                  <InfoTooltip content="Funds held in this account that are reserved/earmarked and excluded from your budget (e.g. kids' offset savings, emergency buffer). Must not exceed Current Balance." />
                </div>
                <input
                  type="number"
                  step="0.01"
                  value={accBuffer}
                  onChange={(e) => setAccBuffer(e.target.value)}
                  placeholder="0.00"
                  className="px-3 py-2 text-xs font-bold rounded-xl border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
                />
              </div>

              {/* Readonly Calculated Amount Available to Budget */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-teal-50/80 border border-teal-200/80 text-xs font-bold">
                <div className="flex items-center gap-1">
                  <span className="text-[#1B2B4B]">Amount Available to Budget:</span>
                  <InfoTooltip content="Net spendable funds in this account (Current Balance − Earmarked Funds)." />
                </div>
                <span className={`font-mono text-sm font-black ${
                  (parseFloat(accBalance) || 0) - (parseFloat(accBuffer) || 0) < 0
                    ? "text-rose-600"
                    : "text-emerald-700"
                }`}>
                  {fmtMoney(Math.max(0, (parseFloat(accBalance) || 0) - (parseFloat(accBuffer) || 0)))}
                </span>
              </div>
            </div>

            {/* Category Type Linkage Section */}
            <div className="flex flex-col gap-2 pt-1 border-t border-zinc-100">
              <div className="flex items-center gap-1">
                <label className="text-xs font-bold text-[#1B2B4B]">Link Category Types to this Account</label>
                <InfoTooltip content="Each category pool (Everyday, Bills, Savings) can only be linked to a single bank account for waterfall payday routing." />
              </div>
              <div className="flex flex-col gap-2">
                {[
                  { key: "EVERYDAY" as const, label: "Everyday Spending Pool", color: "emerald" },
                  { key: "REGULAR" as const, label: "Regular Bills Pool", color: "blue" },
                  { key: "GOAL" as const, label: "Savings Goals Pool", color: "indigo" },
                ].map((item) => {
                  const isChecked = accSelectedTypes.includes(item.key);
                  const currentOwner = accounts.find((a) => a.id !== editingAccount?.id && a.categoryTypes.includes(item.key));

                  return (
                    <label
                      key={item.key}
                      className={`flex items-center justify-between p-3 rounded-xl border text-xs font-bold cursor-pointer transition-colors ${
                        isChecked ? "bg-teal-50/50 border-[#00B4A6] text-[#1B2B4B]" : "bg-zinc-50/50 border-zinc-200 text-zinc-600"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleCategoryTypeToggle(item.key)}
                          className="w-4 h-4 text-[#00B4A6] rounded focus:ring-2 focus:ring-[#00B4A6]"
                        />
                        <span>{item.label}</span>
                      </div>
                      {currentOwner && !isChecked && (
                        <span className="text-[10px] font-normal text-zinc-400">Currently linked: {currentOwner.name}</span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-zinc-700 bg-slate-50 p-3 rounded-xl border border-zinc-200">
              <input
                type="checkbox"
                checked={accIsPrivate}
                disabled={isTrialExpired}
                onChange={(e) => setAccIsPrivate(e.target.checked)}
                className="w-4 h-4 text-[#00B4A6] rounded focus:ring-2 focus:ring-[#00B4A6]"
              />
              <span>🔒 Private Personal Account {isTrialExpired ? "(Trial Expired)" : "(Hidden from other users)"}</span>
            </label>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 text-xs font-bold text-zinc-600 rounded-xl hover:bg-zinc-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createAccountMut.isPending || updateAccountMut.isPending}
                className="px-4 py-2 text-xs font-bold text-white rounded-xl bg-[#00B4A6] hover:opacity-90 disabled:opacity-50 transition-all shadow-md"
              >
                {createAccountMut.isPending || updateAccountMut.isPending ? "Saving..." : editingAccount ? "Save Changes" : "Create Account"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Bank Account Selected CSV Import Modal */}
      {selectedAccountForImport && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full flex flex-col gap-4 shadow-xl border border-zinc-100">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-[#1B2B4B] flex items-center gap-2">
                  <span>📄 CSV Import:</span>
                  <span className="text-[#00B4A6]">{selectedAccountForImport.name}</span>
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Select your bank provider for automated header mapping and transaction parsing.
                </p>
              </div>
              <button type="button" onClick={() => setSelectedAccountForImport(null)} className="text-zinc-400 hover:text-zinc-600 font-bold">
                ✕
              </button>
            </div>

            {/* Bank Institution Selection */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-zinc-700">Bank Institution:</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {BANK_OPTIONS.map((b) => (
                  <button
                    key={b.key}
                    type="button"
                    onClick={() => setSelectedBankProvider(b.key)}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                      selectedBankProvider === b.key
                        ? "border-[#00B4A6] bg-teal-50/40 shadow-xs"
                        : "border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700"
                    }`}
                  >
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black ${b.logoBg} ${b.textColor}`}>
                      {b.key}
                    </span>
                    <span className="text-[11px] truncate w-full text-center">{b.key}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Instructions Accordion Toggle */}
            <button
              type="button"
              onClick={() => setShowImportGuide(!showImportGuide)}
              className="text-xs font-bold text-[#00B4A6] hover:underline flex items-center gap-1 self-start"
            >
              <span>{showImportGuide ? "Hide export steps ▲" : `How to export CSV from ${selectedBankProvider} ▼`}</span>
            </button>

            {showImportGuide && (
              <div className="bg-teal-50/50 border border-teal-100 rounded-xl p-3.5 text-xs text-zinc-700 space-y-1.5">
                <p className="font-bold text-[#1B2B4B]">Exporting CSV for {selectedBankProvider}:</p>
                <p className="text-zinc-600 leading-relaxed">
                  Log into your bank&apos;s online portal $\rightarrow$ Select <strong>{selectedAccountForImport.name}</strong> $\rightarrow$ Export / Download transactions $\rightarrow$ Select CSV format.
                </p>
              </div>
            )}

            {/* File Upload Drop Area */}
            <div className="flex items-center gap-3 pt-1">
              <label className="flex-1 cursor-pointer bg-zinc-50 border-2 border-dashed border-zinc-300 hover:border-[#00B4A6] rounded-xl p-5 text-center transition-colors">
                <span className="text-xs font-bold text-zinc-700">
                  {parseCsvMut.isPending ? "Parsing CSV File..." : `📁 Upload ${selectedBankProvider} CSV File`}
                </span>
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={parseCsvMut.isPending}
                />
              </label>
            </div>

            {csvResultMsg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold p-3 rounded-xl">
                {csvResultMsg}
              </div>
            )}

            {/* Fallback Custom Mapper */}
            {showCustomMapper && (
              <div className="flex flex-col gap-3 p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                <p className="text-xs font-bold text-zinc-700">Map CSV Columns manually:</p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-600">Date Col:</label>
                    <select
                      value={dateCol}
                      onChange={(e) => setDateCol(Number(e.target.value))}
                      className="w-full p-1.5 text-xs border rounded-lg"
                    >
                      {rawHeaders.map((h, i) => (
                        <option key={i} value={i}>{h || `Col ${i + 1}`}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-600">Desc Col:</label>
                    <select
                      value={descCol}
                      onChange={(e) => setDescCol(Number(e.target.value))}
                      className="w-full p-1.5 text-xs border rounded-lg"
                    >
                      {rawHeaders.map((h, i) => (
                        <option key={i} value={i}>{h || `Col ${i + 1}`}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-600">Amount Col:</label>
                    <select
                      value={amountCol}
                      onChange={(e) => setAmountCol(Number(e.target.value))}
                      className="w-full p-1.5 text-xs border rounded-lg"
                    >
                      {rawHeaders.map((h, i) => (
                        <option key={i} value={i}>{h || `Col ${i + 1}`}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleApplyCustomMapping}
                  className="px-3 py-1.5 text-xs font-bold text-white rounded-lg bg-[#00B4A6] hover:opacity-90 self-end"
                >
                  Apply & Parse
                </button>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setSelectedAccountForImport(null)}
                className="px-4 py-2 text-xs font-bold text-zinc-600 rounded-xl hover:bg-zinc-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
