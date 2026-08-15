"use client";

import React, { useState, useEffect, useMemo } from "react";
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

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "DEBIT" | "CREDIT" | "DUPLICATES">("ALL");

  // Inline Add Category State
  const [showAddCategoryInline, setShowAddCategoryInline] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatType, setNewCatType] = useState<"EVERYDAY" | "REGULAR" | "GOAL">("EVERYDAY");

  // Custom Column Mapping State (Step 1 Fallback)
  const [showCustomMapper, setShowCustomMapper] = useState(false);
  const [rawTextContent, setRawTextContent] = useState<string>("");
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [dateColIndex, setDateColIndex] = useState(0);
  const [descColIndex, setDescColIndex] = useState(1);
  const [amountColIndex, setAmountColIndex] = useState(2);

  // Parsed result state
  const [parsedData, setParsedData] = useState<{
    bank: string;
    transactions: ParsedTx[];
  } | null>(null);

  // Per-row state
  const [selectedMap, setSelectedMap] = useState<Record<number, boolean>>({});
  const [categoryMap, setCategoryMap] = useState<Record<number, string>>({});
  const [incomeSourceMap, setIncomeSourceMap] = useState<Record<number, string>>({});
  const [commitResult, setCommitResult] = useState<{ importedCount: number; skippedDuplicatesCount: number; batchId?: string } | null>(null);

  // Queries
  const categoriesQuery = trpc.listCategories.useQuery(undefined, { enabled: isOpen });
  const incomeSourcesQuery = trpc.listIncomeSources.useQuery(undefined, { enabled: isOpen });
  const bankAccountsQuery = trpc.getBankAccountsWithMappings.useQuery(undefined, { enabled: isOpen });

  const categories = categoriesQuery.data ?? [];
  const incomeSources = incomeSourcesQuery.data ?? [];
  const bankAccounts = useMemo(() => bankAccountsQuery.data ?? [], [bankAccountsQuery.data]);

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
      if (data.transactions.length === 0 && data.headers && data.headers.length > 0 && !showCustomMapper) {
        setRawHeaders(data.headers);
        setShowCustomMapper(true);
        setErrorMessage("Unrecognised bank CSV format. Please map the columns manually below.");
        return;
      }

      setParsedData(data);
      setShowCustomMapper(false);
      const initialSelected: Record<number, boolean> = {};
      const initialCategories: Record<number, string> = {};
      const initialIncome: Record<number, string> = {};

      const everydayCat = categories.find((c) => c.type === "EVERYDAY") || categories[0];

      data.transactions.forEach((tx, idx) => {
        initialSelected[idx] = !tx.isDuplicate;

        if (tx.flowType === "DEBIT") {
          const matched = categories.find(
            (c) => c.name.toLowerCase() === (tx.suggestedCategoryName || "").toLowerCase()
          );
          initialCategories[idx] = matched ? matched.id : everydayCat?.id || "";
        } else {
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

  const createCategoryMut = trpc.createCategory.useMutation({
    onSuccess: (newCat) => {
      categoriesQuery.refetch();
      setNewCatName("");
      setShowAddCategoryInline(false);
      if (newCat && newCat.id && parsedData) {
        const nextCat = { ...categoryMap };
        parsedData.transactions.forEach((tx, idx) => {
          if (selectedMap[idx] && tx.flowType === "DEBIT") {
            nextCat[idx] = newCat.id;
          }
        });
        setCategoryMap(nextCat);
      }
    },
    onError: (err) => {
      setErrorMessage(`Category Creation Failed: ${err.message}`);
    },
  });

  const transactions = useMemo(() => parsedData?.transactions ?? [], [parsedData]);

  // Running Financial Summary Math
  const { selectedExpenses, selectedIncome, netImpact, selectedCount, duplicateCount } = useMemo(() => {
    let expSum = 0;
    let incSum = 0;
    let selCount = 0;
    let dupCount = 0;

    transactions.forEach((tx, idx) => {
      if (tx.isDuplicate) dupCount++;
      if (selectedMap[idx]) {
        selCount++;
        const amt = parseFloat(tx.amount) || 0;
        if (tx.flowType === "DEBIT") {
          expSum += amt;
        } else {
          incSum += amt;
        }
      }
    });

    return {
      selectedExpenses: expSum,
      selectedIncome: incSum,
      netImpact: incSum - expSum,
      selectedCount: selCount,
      duplicateCount: dupCount,
    };
  }, [transactions, selectedMap]);

  // Filtered rows for Step 2
  const filteredRows = useMemo(() => {
    return transactions
      .map((tx, idx) => ({ tx, idx }))
      .filter(({ tx }) => {
        if (hideDuplicates && tx.isDuplicate) return false;
        if (filterType === "DEBIT" && tx.flowType !== "DEBIT") return false;
        if (filterType === "CREDIT" && tx.flowType !== "CREDIT") return false;
        if (filterType === "DUPLICATES" && !tx.isDuplicate) return false;
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const matchDesc = tx.description.toLowerCase().includes(q);
          const matchAmt = tx.amount.includes(q);
          if (!matchDesc && !matchAmt) return false;
        }
        return true;
      });
  }, [transactions, hideDuplicates, filterType, searchQuery]);

  if (!isOpen) return null;

  const processFile = (file: File) => {
    if (!file) return;
    setFileName(file.name);
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      setRawTextContent(text);
      parseCsvMutation.mutate({ csvText: text, bankAccountId: targetBankAccountId });
    };
    reader.readAsText(file);
  };

  const handleApplyCustomMapping = () => {
    if (!rawTextContent) return;
    parseCsvMutation.mutate({
      csvText: rawTextContent,
      bankAccountId: targetBankAccountId,
      customMapping: {
        dateColIndex,
        descColIndex,
        amountColIndex,
      },
    });
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

  const handleCreateInlineCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    createCategoryMut.mutate({
      name: newCatName.trim(),
      type: newCatType,
    });
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
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
          <div className="mx-6 mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex justify-between items-center">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="font-bold text-rose-500 hover:text-rose-800">
              ✕
            </button>
          </div>
        )}

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
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

              {/* Custom Column Mapper (Fallback) */}
              {showCustomMapper && (
                <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl space-y-3">
                  <h4 className="text-xs font-bold text-amber-900">Custom Column Mapping</h4>
                  <p className="text-xs text-amber-800">
                    Specify which columns match Date, Description, and Amount in your CSV file:
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600">Date Column:</label>
                      <select
                        value={dateColIndex}
                        onChange={(e) => setDateColIndex(Number(e.target.value))}
                        className="w-full p-2 text-xs border rounded-lg bg-white"
                      >
                        {rawHeaders.map((h, i) => (
                          <option key={i} value={i}>{h || `Col ${i + 1}`}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600">Description Column:</label>
                      <select
                        value={descColIndex}
                        onChange={(e) => setDescColIndex(Number(e.target.value))}
                        className="w-full p-2 text-xs border rounded-lg bg-white"
                      >
                        {rawHeaders.map((h, i) => (
                          <option key={i} value={i}>{h || `Col ${i + 1}`}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600">Amount Column:</label>
                      <select
                        value={amountColIndex}
                        onChange={(e) => setAmountColIndex(Number(e.target.value))}
                        className="w-full p-2 text-xs border rounded-lg bg-white"
                      >
                        {rawHeaders.map((h, i) => (
                          <option key={i} value={i}>{h || `Col ${i + 1}`}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleApplyCustomMapping}
                      className="px-4 py-2 text-xs font-bold text-white bg-[#00B4A6] hover:bg-[#009b8f] rounded-lg shadow-xs"
                    >
                      Apply Column Mapping & Parse
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: REVIEW & MAP */}
          {step === 2 && parsedData && (
            <div className="space-y-4">
              {/* Running Financial Totals Metrics Banner */}
              <div className="grid grid-cols-3 gap-3 p-3.5 bg-slate-900 rounded-2xl text-white shadow-xs">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Selected Expenses</span>
                  <span className="text-base font-black text-rose-400 tabular-nums">
                    -${selectedExpenses.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Selected Income</span>
                  <span className="text-base font-black text-emerald-400 tabular-nums">
                    +${selectedIncome.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Net Impact</span>
                  <span className={`text-base font-black tabular-nums ${netImpact >= 0 ? "text-teal-400" : "text-rose-400"}`}>
                    {netImpact >= 0 ? "+" : ""}${netImpact.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Search & Filter Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search description or amount..."
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg p-0.5">
                    {(["ALL", "DEBIT", "CREDIT", "DUPLICATES"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setFilterType(t)}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-colors ${
                          filterType === t ? "bg-[#00B4A6] text-white" : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {t === "ALL" ? "All" : t === "DEBIT" ? "Debits" : t === "CREDIT" ? "Credits" : "Duplicates"}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowAddCategoryInline(!showAddCategoryInline)}
                    className="px-3 py-1.5 text-xs font-bold bg-teal-50 border border-teal-200 text-[#00B4A6] hover:bg-teal-100 rounded-lg flex items-center gap-1"
                  >
                    <span>➕</span>
                    <span>Add Category</span>
                  </button>
                </div>
              </div>

              {/* Inline Add Category Form */}
              {showAddCategoryInline && (
                <form onSubmit={handleCreateInlineCategory} className="p-3 bg-teal-50/60 border border-teal-200 rounded-xl flex items-center gap-3 animate-in fade-in duration-150">
                  <input
                    type="text"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="New category name (e.g. Pet Care)..."
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-semibold"
                    required
                  />
                  <select
                    value={newCatType}
                    onChange={(e) => setNewCatType(e.target.value as "EVERYDAY" | "REGULAR" | "GOAL")}
                    className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-bold text-slate-700"
                  >
                    <option value="EVERYDAY">Everyday Pool</option>
                    <option value="REGULAR">Bills Pool</option>
                    <option value="GOAL">Savings Pool</option>
                  </select>
                  <button
                    type="submit"
                    disabled={createCategoryMut.isPending}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-[#00B4A6] hover:bg-[#009b8f] rounded-lg shadow-xs"
                  >
                    {createCategoryMut.isPending ? "Creating..." : "Save Category"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddCategoryInline(false)}
                    className="text-xs font-bold text-slate-400 hover:text-slate-600"
                  >
                    Cancel
                  </button>
                </form>
              )}

              {/* Summary Controls Bar */}
              <div className="flex items-center justify-between text-xs font-bold text-slate-600 px-1">
                <div className="flex items-center gap-3">
                  <span>
                    Showing {filteredRows.length} of {transactions.length} rows ({selectedCount} selected)
                  </span>
                  {duplicateCount > 0 && (
                    <span className="text-amber-700 font-extrabold">
                      ⚠️ {duplicateCount} Duplicates Pre-Unchecked
                    </span>
                  )}
                  <label className="flex items-center gap-1.5 cursor-pointer text-[#00B4A6]">
                    <input
                      type="checkbox"
                      checked={hideDuplicates}
                      onChange={(e) => setHideDuplicates(e.target.checked)}
                      className="rounded text-[#00B4A6] focus:ring-[#00B4A6]"
                    />
                    <span>Hide Duplicates</span>
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Bulk Category:</span>
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

              {/* Transactions Data Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-80 overflow-y-auto text-xs">
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
                    {filteredRows.map(({ tx, idx }) => {
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
                {commitResult.batchId && (
                  <p className="text-[10px] text-slate-400 font-mono pt-1">
                    Batch ID: {commitResult.batchId}
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
