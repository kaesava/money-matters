"use client";

import React, { useState, useEffect } from "react";
import { trpc } from "../lib/trpc";
import { Spinner } from "@money-matters/ui/web";

interface ParsedTx {
  date: string;
  description: string;
  amount: string;
  flowType: "CREDIT" | "DEBIT";
  suggestedCategoryName?: string | null;
  idempotencyKey: string;
  rawBank: string;
  isDuplicate?: boolean;
}

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  bankAccountId?: string;
  onSuccess?: () => void;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  isOpen,
  onClose,
  bankAccountId: initialBankAccountId,
  onSuccess,
}) => {
  const utils = trpc.useUtils();

  // Step state: 1 = Upload, 2 = Review & Map, 3 = Complete
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fileName, setFileName] = useState<string>("");
  const [targetBankAccountId, setTargetBankAccountId] = useState<string>(initialBankAccountId || "");
  const [isDragging, setIsDragging] = useState(false);
  const [hideDuplicates, setHideDuplicates] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Parsed result state
  const [parsedData, setParsedData] = useState<{
    bank: string;
    transactions: ParsedTx[];
  } | null>(null);

  // Per-row state
  const [selectedMap, setSelectedMap] = useState<Record<number, boolean>>({});
  const [categoryMap, setCategoryMap] = useState<Record<number, string>>({});
  const [incomeSourceMap, setIncomeSourceMap] = useState<Record<number, string>>({});
  const [commitResult, setCommitResult] = useState<{ importedCount: number; skippedDuplicatesCount: number } | null>(null);

  // Queries
  const categoriesQuery = trpc.listCategories.useQuery(undefined, { enabled: isOpen });
  const incomeSourcesQuery = trpc.listIncomeSources.useQuery(undefined, { enabled: isOpen });
  const bankAccountsQuery = trpc.getBankAccountsWithMappings.useQuery(undefined, { enabled: isOpen });

  const categories = categoriesQuery.data ?? [];
  const incomeSources = incomeSourcesQuery.data ?? [];
  const bankAccounts = bankAccountsQuery.data ?? [];

  // Default target account if not passed
  useEffect(() => {
    if (initialBankAccountId) {
      setTargetBankAccountId(initialBankAccountId);
    } else if (bankAccounts.length > 0 && !targetBankAccountId) {
      setTargetBankAccountId(bankAccounts[0].id);
    }
  }, [initialBankAccountId, bankAccounts, targetBankAccountId]);

  // Mutations
  const parseCsvMutation = trpc.parseCsv.useMutation({
    onSuccess: (data) => {
      setParsedData(data);
      const initialSelected: Record<number, boolean> = {};
      const initialCategories: Record<number, string> = {};
      const initialIncome: Record<number, string> = {};

      const everydayCat = categories.find((c) => c.type === "EVERYDAY") || categories[0];

      data.transactions.forEach((tx, idx) => {
        // Pre-uncheck duplicates
        initialSelected[idx] = !tx.isDuplicate;

        // Auto-match category name if found
        if (tx.flowType === "DEBIT") {
          const matched = categories.find(
            (c) => c.name.toLowerCase() === (tx.suggestedCategoryName || "").toLowerCase()
          );
          initialCategories[idx] = matched ? matched.id : everydayCat?.id || "";
        } else {
          // CREDIT
          const matchedInc = incomeSources.find((inc) =>
            tx.description.toLowerCase().includes(inc.name.toLowerCase())
          );
          if (matchedInc) {
            initialIncome[idx] = matchedInc.id;
          } else {
            initialCategories[idx] = everydayCat?.id || "";
          }
        }
      });

      setSelectedMap(initialSelected);
      setCategoryMap(initialCategories);
      setIncomeSourceMap(initialIncome);
      setStep(2);
    },
    onError: (err) => {
      setErrorMessage(`CSV Parse Error: ${err.message}`);
    },
  });

  const commitCsvMutation = trpc.commitCsvImport.useMutation({
    onSuccess: (res) => {
      setCommitResult(res);
      setStep(3);
      utils.listTransactions.invalidate();
      utils.getBankAccountsWithMappings.invalidate();
      if (onSuccess) onSuccess();
    },
    onError: (err) => {
      setErrorMessage(`Import Failed: ${err.message}`);
    },
  });

  if (!isOpen) return null;

  const processFile = (file: File) => {
    if (!file) return;
    setFileName(file.name);
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      parseCsvMutation.mutate({ csvText: text, bankAccountId: targetBankAccountId });
    };
    reader.readAsText(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith(".csv")) {
      processFile(file);
    }
  };

  const handleToggleSelectAll = (checked: boolean) => {
    if (!parsedData) return;
    const next: Record<number, boolean> = {};
    parsedData.transactions.forEach((tx, idx) => {
      if (hideDuplicates && tx.isDuplicate) return;
      next[idx] = checked;
    });
    setSelectedMap((prev) => ({ ...prev, ...next }));
  };

  const handleBulkCategoryChange = (catId: string) => {
    if (!catId || !parsedData) return;
    const nextCat: Record<number, string> = { ...categoryMap };
    parsedData.transactions.forEach((tx, idx) => {
      if (selectedMap[idx] && tx.flowType === "DEBIT") {
        nextCat[idx] = catId;
      }
    });
    setCategoryMap(nextCat);
  };

  const handleConfirmImport = () => {
    if (!parsedData || !targetBankAccountId) return;
    setErrorMessage(null);

    const selectedTransactions = parsedData.transactions
      .map((tx, idx) => ({ tx, idx }))
      .filter(({ idx }) => selectedMap[idx])
      .map(({ tx, idx }) => ({
        date: tx.date,
        description: tx.description,
        amount: tx.amount,
        flowType: tx.flowType,
        categoryId: categoryMap[idx] || null,
        incomeSourceId: incomeSourceMap[idx] || null,
        idempotencyKey: tx.idempotencyKey,
        note: tx.description,
      }));

    if (selectedTransactions.length === 0) {
      setErrorMessage("Please select at least one transaction to import.");
      return;
    }

    commitCsvMutation.mutate({
      bankAccountId: targetBankAccountId,
      transactions: selectedTransactions,
    });
  };

  const transactions = parsedData?.transactions ?? [];
  const selectedCount = Object.values(selectedMap).filter(Boolean).length;
  const duplicateCount = transactions.filter((t) => t.isDuplicate).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="text-lg font-extrabold text-[#1B2B4B] flex items-center gap-2">
              <span>📄</span>
              <span>Bank Statement CSV Import Wizard</span>
            </h3>
            <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 mt-1">
              <span className={step === 1 ? "text-[#00B4A6] font-bold" : ""}>1. Upload Statement</span>
              <span>→</span>
              <span className={step === 2 ? "text-[#00B4A6] font-bold" : ""}>2. Review & Map</span>
              <span>→</span>
              <span className={step === 3 ? "text-[#00B4A6] font-bold" : ""}>3. Complete</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors font-bold text-lg"
          >
            ✕
          </button>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex justify-between items-center">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="font-bold text-rose-500 hover:text-rose-800">
              ✕
            </button>
          </div>
        )}

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* STEP 1: UPLOAD */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Target Bank Account Selection */}
              <div className="flex flex-col gap-1.5 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <label className="text-xs font-bold text-[#1B2B4B]">Target Bank Account for Import:</label>
                <select
                  value={targetBankAccountId}
                  onChange={(e) => setTargetBankAccountId(e.target.value)}
                  className="px-3 py-2 text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-800 focus:ring-2 focus:ring-[#00B4A6]"
                >
                  {bankAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.categoryTypes.join(", ") || "Unlinked"})
                    </option>
                  ))}
                </select>
              </div>

              {parseCsvMutation.isPending ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Spinner size="lg" className="text-[#00B4A6]" />
                  <span className="text-sm font-bold text-slate-600">Parsing statement & checking duplicates...</span>
                </div>
              ) : (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all ${
                    isDragging
                      ? "border-[#00B4A6] bg-teal-50/50 scale-[1.01]"
                      : "border-slate-300 hover:border-[#00B4A6] bg-slate-50/50"
                  }`}
                >
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="csv-file-input-modal"
                  />
                  <label htmlFor="csv-file-input-modal" className="cursor-pointer flex flex-col items-center gap-3">
                    <span className="text-4xl">{isDragging ? "📥" : "📄"}</span>
                    <div>
                      <p className="font-extrabold text-slate-800 text-sm">
                        {fileName ? fileName : "Click to select or drag & drop CSV statement"}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Supports statement CSV exports from CBA, Westpac, ANZ, NAB, ING, Macquarie
                      </p>
                    </div>
                  </label>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: REVIEW & MAP */}
          {step === 2 && parsedData && (
            <div className="space-y-4">
              {/* Summary Header & Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800">
                    Detected Format: <strong className="text-[#00B4A6]">{parsedData.bank}</strong>
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                    {transactions.length} Rows
                  </span>
                  {duplicateCount > 0 && (
                    <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                      ⚠️ {duplicateCount} Duplicates Pre-Unchecked
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hideDuplicates}
                      onChange={(e) => setHideDuplicates(e.target.checked)}
                      className="rounded text-[#00B4A6] focus:ring-[#00B4A6]"
                    />
                    <span>Hide Duplicates</span>
                  </label>

                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-slate-500">Bulk Category:</span>
                    <select
                      onChange={(e) => handleBulkCategoryChange(e.target.value)}
                      defaultValue=""
                      className="px-2 py-1 text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-700"
                    >
                      <option value="" disabled>
                        Apply to checked DEBITs...
                      </option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Transactions Data Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-96 overflow-y-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-600 font-bold uppercase sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="p-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={selectedCount > 0 && selectedCount === transactions.length}
                          onChange={(e) => handleToggleSelectAll(e.target.checked)}
                          className="rounded text-[#00B4A6] focus:ring-[#00B4A6]"
                        />
                      </th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Description</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Category / Income Target</th>
                      <th className="p-3 text-right">Amount</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {transactions.map((tx, idx) => {
                      if (hideDuplicates && tx.isDuplicate) return null;
                      const isChecked = !!selectedMap[idx];

                      return (
                        <tr
                          key={idx}
                          className={`hover:bg-slate-50 transition-colors ${
                            tx.isDuplicate ? "bg-amber-50/40" : ""
                          }`}
                        >
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) =>
                                setSelectedMap((prev) => ({ ...prev, [idx]: e.target.checked }))
                              }
                              className="rounded text-[#00B4A6] focus:ring-[#00B4A6]"
                            />
                          </td>
                          <td className="p-3 whitespace-nowrap text-slate-500 font-mono">{tx.date}</td>
                          <td className="p-3 font-semibold text-slate-800 max-w-xs truncate" title={tx.description}>
                            {tx.description}
                          </td>
                          <td className="p-3">
                            <span
                              className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                tx.flowType === "CREDIT"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {tx.flowType}
                            </span>
                          </td>
                          <td className="p-3">
                            {tx.flowType === "DEBIT" ? (
                              <select
                                value={categoryMap[idx] || ""}
                                onChange={(e) =>
                                  setCategoryMap((prev) => ({ ...prev, [idx]: e.target.value }))
                                }
                                className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white font-bold text-slate-700"
                              >
                                {categories.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <select
                                value={incomeSourceMap[idx] || categoryMap[idx] || ""}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (incomeSources.some((inc) => inc.id === val)) {
                                    setIncomeSourceMap((prev) => ({ ...prev, [idx]: val }));
                                  } else {
                                    setCategoryMap((prev) => ({ ...prev, [idx]: val }));
                                  }
                                }}
                                className="w-full px-2 py-1 text-xs border border-emerald-300 bg-emerald-50/50 rounded-lg font-bold text-emerald-900"
                              >
                                <optgroup label="Income Sources">
                                  {incomeSources.map((inc) => (
                                    <option key={inc.id} value={inc.id}>
                                      💰 {inc.name}
                                    </option>
                                  ))}
                                </optgroup>
                                <optgroup label="Category Pool Target">
                                  {categories.map((c) => (
                                    <option key={c.id} value={c.id}>
                                      📂 {c.name}
                                    </option>
                                  ))}
                                </optgroup>
                              </select>
                            )}
                          </td>
                          <td
                            className={`p-3 text-right font-mono font-bold tabular-nums ${
                              tx.flowType === "CREDIT" ? "text-emerald-600" : "text-slate-900"
                            }`}
                          >
                            {tx.flowType === "CREDIT" ? "+" : "-"}${tx.amount}
                          </td>
                          <td className="p-3 text-center">
                            {tx.isDuplicate ? (
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                ⚠️ Duplicate
                              </span>
                            ) : (
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Ready
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 3: COMPLETE */}
          {step === 3 && commitResult && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl">
                ✓
              </div>
              <h4 className="text-xl font-extrabold text-[#1B2B4B]">Statement Import Complete!</h4>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs font-semibold text-slate-700 max-w-sm w-full">
                <p className="text-emerald-700 font-bold text-sm">
                  {commitResult.importedCount} Transactions Imported
                </p>
                {commitResult.skippedDuplicatesCount > 0 && (
                  <p className="text-amber-700">
                    ({commitResult.skippedDuplicatesCount} duplicate records skipped)
                  </p>
                )}
                <p className="text-slate-500 pt-1">Your ledger and available balances have been updated.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Controls */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
          <div>
            {step === 2 && (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900"
              >
                ← Back to Upload
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-200"
            >
              {step === 3 ? "Done" : "Cancel"}
            </button>

            {step === 2 && (
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={commitCsvMutation.isPending || selectedCount === 0}
                className="px-6 py-2 text-xs font-bold bg-[#00B4A6] hover:bg-[#009b8f] text-white rounded-xl shadow-xs transition-colors disabled:opacity-50"
              >
                {commitCsvMutation.isPending
                  ? "Importing Transactions..."
                  : `Confirm & Import (${selectedCount})`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
