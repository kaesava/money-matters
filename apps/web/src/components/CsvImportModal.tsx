"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { trpc } from "../lib/trpc";
import { CsvStepUpload } from "./csv-import/CsvStepUpload";
import { CsvStepReview, ParsedTx } from "./csv-import/CsvStepReview";
import { CsvStepComplete } from "./csv-import/CsvStepComplete";

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
    statementStartDate?: string | null;
    statementEndDate?: string | null;
  } | null>(null);

  const [isFlipped, setIsFlipped] = useState(false);

  const handleFlipPolarity = () => {
    setIsFlipped((prev) => !prev);
  };

  const getFlowType = useCallback((tx: ParsedTx) => {
    if (!isFlipped) return tx.flowType;
    return tx.flowType === "DEBIT" ? "CREDIT" : "DEBIT";
  }, [isFlipped]);

  // Per-row state
  const [selectedMap, setSelectedMap] = useState<Record<number, boolean>>({});
  const [categoryMap, setCategoryMap] = useState<Record<number, string>>({});
  const [incomeSourceMap, setIncomeSourceMap] = useState<Record<number, string>>({});
  const [commitResult, setCommitResult] = useState<{ importedCount: number; skippedDuplicatesCount: number; batchId?: string } | null>(null);

  // Queries
  const categoriesQuery = trpc.listCategories.useQuery(undefined, { enabled: isOpen });
  const incomeSourcesQuery = trpc.listIncomeSources.useQuery(undefined, { enabled: isOpen });
  const bankAccountsQuery = trpc.getBankAccountsWithMappings.useQuery(undefined, { enabled: isOpen });

  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);
  const incomeSources = useMemo(() => incomeSourcesQuery.data ?? [], [incomeSourcesQuery.data]);
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
          if (selectedMap[idx] && getFlowType(tx) === "DEBIT") {
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

  // Filtered transactions for Step 2
  const filteredTransactions = useMemo(() => {
    if (!parsedData) return [];
    return parsedData.transactions
      .map((tx, idx) => ({ tx, idx }))
      .filter(({ tx }) => {
        const flow = getFlowType(tx);
        if (filterType === "DEBIT" && flow !== "DEBIT") return false;
        if (filterType === "CREDIT" && flow !== "CREDIT") return false;
        if (filterType === "DUPLICATES" && !tx.isDuplicate) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchDesc = tx.description.toLowerCase().includes(q);
          const matchAmt = tx.amount.includes(q);
          if (!matchDesc && !matchAmt) return false;
        }
        return true;
      });
  }, [parsedData, filterType, searchQuery, getFlowType]);

  const selectedCount = useMemo(() => {
    return Object.values(selectedMap).filter(Boolean).length;
  }, [selectedMap]);

  const selectedExpenses = useMemo(() => {
    if (!parsedData) return 0;
    return parsedData.transactions.reduce((acc, tx, idx) => {
      if (selectedMap[idx] && getFlowType(tx) === "DEBIT") {
        return acc + parseFloat(tx.amount || "0");
      }
      return acc;
    }, 0);
  }, [parsedData, selectedMap, getFlowType]);

  const selectedIncome = useMemo(() => {
    if (!parsedData) return 0;
    return parsedData.transactions.reduce((acc, tx, idx) => {
      if (selectedMap[idx] && getFlowType(tx) === "CREDIT") {
        return acc + parseFloat(tx.amount || "0");
      }
      return acc;
    }, 0);
  }, [parsedData, selectedMap, getFlowType]);

  const netImpact = selectedIncome - selectedExpenses;

  const allSelected = useMemo(() => {
    if (filteredTransactions.length === 0) return false;
    return filteredTransactions.every(({ idx }) => selectedMap[idx]);
  }, [filteredTransactions, selectedMap]);

  const processFile = (file: File) => {
    setFileName(file.name);
    setErrorMessage(null);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (text) {
        setRawTextContent(text);
        parseCsvMutation.mutate({
          csvText: text,
          bankAccountId: targetBankAccountId,
        });
      }
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
      if (filterType !== "DUPLICATES" && tx.isDuplicate) return;
      next[idx] = checked;
    });
    setSelectedMap((prev) => ({ ...prev, ...next }));
  };

  const handleBulkCategoryChange = (catId: string) => {
    if (!catId || !parsedData) return;
    const nextCat: Record<number, string> = { ...categoryMap };
    parsedData.transactions.forEach((tx, idx) => {
      if (selectedMap[idx] && getFlowType(tx) === "DEBIT") {
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
        flowType: getFlowType(tx),
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

  if (!isOpen) return null;

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
              <span className={step === 1 ? "text-[#2563eb] font-bold" : ""}>1. Upload Statement</span>
              <span>→</span>
              <span className={step === 2 ? "text-[#2563eb] font-bold" : ""}>2. Review & Map</span>
              <span>→</span>
              <span className={step === 3 ? "text-[#2563eb] font-bold" : ""}>3. Complete</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors font-bold text-lg cursor-pointer"
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
          {step === 1 && (
            <CsvStepUpload
              bankAccounts={bankAccounts}
              targetBankAccountId={targetBankAccountId}
              setTargetBankAccountId={setTargetBankAccountId}
              isParsing={parseCsvMutation.isPending}
              isDragging={isDragging}
              fileName={fileName}
              showCustomMapper={showCustomMapper}
              rawHeaders={rawHeaders}
              dateColIndex={dateColIndex}
              setDateColIndex={setDateColIndex}
              descColIndex={descColIndex}
              setDescColIndex={setDescColIndex}
              amountColIndex={amountColIndex}
              setAmountColIndex={setAmountColIndex}
              handleFileUpload={handleFileUpload}
              handleDragOver={handleDragOver}
              handleDragLeave={handleDragLeave}
              handleDrop={handleDrop}
              handleApplyCustomMapping={handleApplyCustomMapping}
            />
          )}

          {step === 2 && parsedData && (
            <CsvStepReview
              parsedData={parsedData}
              selectedExpenses={selectedExpenses}
              selectedIncome={selectedIncome}
              netImpact={netImpact}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              filterType={filterType}
              setFilterType={setFilterType}
              showAddCategoryInline={showAddCategoryInline}
              setShowAddCategoryInline={setShowAddCategoryInline}
              newCatName={newCatName}
              setNewCatName={setNewCatName}
              newCatType={newCatType}
              setNewCatType={setNewCatType}
              isCreatingCategory={createCategoryMut.isPending}
              handleCreateInlineCategory={handleCreateInlineCategory}
              handleFlipPolarity={handleFlipPolarity}
              getFlowType={getFlowType}
              filteredTransactions={filteredTransactions}
              allSelected={allSelected}
              handleToggleSelectAll={handleToggleSelectAll}
              categories={categories}
              incomeSources={incomeSources}
              selectedMap={selectedMap}
              setSelectedMap={setSelectedMap}
              categoryMap={categoryMap}
              setCategoryMap={setCategoryMap}
              incomeSourceMap={incomeSourceMap}
              setIncomeSourceMap={setIncomeSourceMap}
              handleBulkCategoryChange={handleBulkCategoryChange}
            />
          )}

          {step === 3 && commitResult && (
            <CsvStepComplete commitResult={commitResult} />
          )}
        </div>

        {/* Footer Controls */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
          <div>
            {step === 2 && (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                ← Back to Upload
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-200 cursor-pointer"
            >
              {step === 3 ? "Done" : "Cancel"}
            </button>

            {step === 2 && (
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={commitCsvMutation.isPending || selectedCount === 0}
                className="px-6 py-2 text-xs font-bold bg-[#2563eb] hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
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
