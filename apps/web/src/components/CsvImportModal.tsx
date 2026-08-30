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

  // Per-row state
  const [selectedMap, setSelectedMap] = useState<Record<number, boolean>>({});
  const [poolMap, setPoolMap] = useState<Record<number, "EVERYDAY" | "REGULAR" | "GOAL">>({});
  const [creditActionMap, setCreditActionMap] = useState<Record<number, "BANK_DEPOSIT" | "PAYDAY_ALLOCATION">>({});
  const [includedMap, setIncludedMap] = useState<Record<number, boolean>>({});
  const [flowTypeOverrideMap, setFlowTypeOverrideMap] = useState<Record<number, "DEBIT" | "CREDIT">>({});
  const [noteMap, setNoteMap] = useState<Record<number, string>>({});
  const [categoryMapState, setCategoryMapState] = useState<Record<number, string>>({});
  const [commitResult, setCommitResult] = useState<{ importedCount: number; skippedDuplicatesCount: number; batchId?: string } | null>(null);

  // Queries
  const bankAccountsQuery = trpc.getBankAccountsWithMappings.useQuery(undefined, { enabled: isOpen });
  const bankAccounts = useMemo(() => bankAccountsQuery.data ?? [], [bankAccountsQuery.data]);

  const categoriesQuery = trpc.listPools.useQuery(undefined, { enabled: isOpen });
  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);

  // Handle Escape key to cancel/close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Default target account if not passed
  useEffect(() => {
    if (initialBankAccountId) {
      setTargetBankAccountId(initialBankAccountId);
    } else if (bankAccounts.length > 0 && !targetBankAccountId) {
      setTargetBankAccountId(bankAccounts[0].id);
    }
  }, [initialBankAccountId, bankAccounts, targetBankAccountId]);

  const getEffectiveFlowType = useCallback(
    (tx: ParsedTx, idx: number) => {
      return flowTypeOverrideMap[idx] || tx.flowType;
    },
    [flowTypeOverrideMap]
  );

  const detectColumnCandidates = useCallback((headers: string[]) => {
    const dateIdx = headers.findIndex((h) => {
      const l = (h || "").toLowerCase();
      return l.includes("date") || l.includes("time") || l.includes("day");
    });

    const descIdx = headers.findIndex((h) => {
      const l = (h || "").toLowerCase();
      return l.includes("desc") || l.includes("narrative") || l.includes("memo") || l.includes("detail") || l.includes("payee");
    });

    const amtIdx = headers.findIndex((h) => {
      const l = (h || "").toLowerCase();
      return l.includes("amount") || l.includes("debit") || l.includes("credit") || l.includes("sum") || l.includes("val");
    });

    return {
      dateCol: dateIdx !== -1 ? dateIdx : 0,
      descCol: descIdx !== -1 ? descIdx : (headers.length > 1 ? 1 : 0),
      amtCol: amtIdx !== -1 ? amtIdx : (headers.length > 2 ? 2 : 0),
    };
  }, []);

  // Mutations
  const parseCsvMutation = trpc.parseCsv.useMutation({
    onSuccess: (data) => {
      if (data.transactions.length === 0) {
        if (data.headers && data.headers.length > 0 && !showCustomMapper) {
          setRawHeaders(data.headers);
          const candidates = detectColumnCandidates(data.headers);
          setDateColIndex(candidates.dateCol);
          setDescColIndex(candidates.descCol);
          setAmountColIndex(candidates.amtCol);
          setShowCustomMapper(true);
          setErrorMessage("Unrecognised bank CSV format. Please map the columns manually below.");
        } else {
          setErrorMessage("0 records found matching column mappings. Please adjust Date, Description, or Amount column selections.");
        }
        return;
      }

      setErrorMessage(null);
      setParsedData(data);
      setShowCustomMapper(false);
      const initialPools: Record<number, "EVERYDAY" | "REGULAR" | "GOAL"> = {};
      const initialCreditActions: Record<number, "BANK_DEPOSIT" | "PAYDAY_ALLOCATION"> = {};
      const initialIncluded: Record<number, boolean> = {};
      const initialNotes: Record<number, string> = {};

      data.transactions.forEach((tx, idx) => {
        initialIncluded[idx] = !tx.isDuplicate;
        initialPools[idx] = "EVERYDAY";
        initialCreditActions[idx] = "BANK_DEPOSIT";
        initialNotes[idx] = tx.description;
      });

      setSelectedMap({});
      setIncludedMap(initialIncluded);
      setPoolMap(initialPools);
      setCreditActionMap(initialCreditActions);
      setNoteMap(initialNotes);
      setCategoryMapState({});
      setFlowTypeOverrideMap({});
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

  // Filtered transactions for Step 2
  const filteredTransactions = useMemo(() => {
    if (!parsedData) return [];
    return parsedData.transactions
      .map((tx, idx) => ({ tx, idx }))
      .filter(({ tx, idx }) => {
        const flow = getEffectiveFlowType(tx, idx);
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
  }, [parsedData, filterType, searchQuery, getEffectiveFlowType]);

  const includedCount = useMemo(() => {
    if (!parsedData) return 0;
    return parsedData.transactions.reduce((acc, _, idx) => {
      return includedMap[idx] !== false ? acc + 1 : acc;
    }, 0);
  }, [parsedData, includedMap]);

  const selectedExpenses = useMemo(() => {
    if (!parsedData) return 0;
    return parsedData.transactions.reduce((acc, tx, idx) => {
      if (includedMap[idx] !== false && getEffectiveFlowType(tx, idx) === "DEBIT") {
        return acc + parseFloat(tx.amount || "0");
      }
      return acc;
    }, 0);
  }, [parsedData, includedMap, getEffectiveFlowType]);

  const selectedIncome = useMemo(() => {
    if (!parsedData) return 0;
    return parsedData.transactions.reduce((acc, tx, idx) => {
      if (includedMap[idx] !== false && getEffectiveFlowType(tx, idx) === "CREDIT") {
        return acc + parseFloat(tx.amount || "0");
      }
      return acc;
    }, 0);
  }, [parsedData, includedMap, getEffectiveFlowType]);

  const netImpact = selectedIncome - selectedExpenses;

  const allSelected = useMemo(() => {
    if (filteredTransactions.length === 0) return false;
    return filteredTransactions.every(({ idx }) => !!selectedMap[idx]);
  }, [filteredTransactions, selectedMap]);

  const processFile = (file: File) => {
    setFileName(file.name);
    setErrorMessage(null);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (text) {
        setRawTextContent(text);

        // Pre-detect headers & candidate columns
        const firstLine = text.split(/\r?\n/).find((l) => l.trim().length > 0) || "";
        const headers = firstLine.split(/,|\t|;/).map((h) => h.replace(/^["']|["']$/g, "").trim());
        if (headers.length > 0) {
          setRawHeaders(headers);
          const candidates = detectColumnCandidates(headers);
          setDateColIndex(candidates.dateCol);
          setDescColIndex(candidates.descCol);
          setAmountColIndex(candidates.amtCol);
        }

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
    const nextSelected = { ...selectedMap };
    filteredTransactions.forEach(({ idx }) => {
      nextSelected[idx] = checked;
    });
    setSelectedMap(nextSelected);
  };

  const handleConfirmImport = () => {
    if (!parsedData) return;

    const payloadTransactions = parsedData.transactions.map((tx, idx) => ({
      date: tx.date,
      description: noteMap[idx] !== undefined ? noteMap[idx] : tx.description,
      amount: tx.amount,
      flowType: getEffectiveFlowType(tx, idx),
      targetPool: poolMap[idx] || "EVERYDAY",
      categoryId: categoryMapState[idx] || undefined,
      creditAction: creditActionMap[idx] || "BANK_DEPOSIT",
      idempotencyKey: tx.idempotencyKey,
      note: noteMap[idx] !== undefined ? noteMap[idx] : tx.description,
      isIncluded: includedMap[idx] !== false,
    }));

    commitCsvMutation.mutate({
      bankAccountId: targetBankAccountId,
      transactions: payloadTransactions,
    });
  };

  const selectedBankAccount = bankAccounts.find((acc) => acc.id === targetBankAccountId);
  const targetBankAccountName = selectedBankAccount
    ? `${selectedBankAccount.name} (${((selectedBankAccount as unknown as { poolTypes?: string[]; categoryTypes?: string[] }).poolTypes || (selectedBankAccount as unknown as { poolTypes?: string[]; categoryTypes?: string[] }).categoryTypes || []).join(", ") || "Unlinked"})`
    : undefined;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#2563eb]/10 text-[#2563eb] flex items-center justify-center font-bold text-base">
              📄
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Import Bank CSV Statement</h3>
              <p className="text-xs text-slate-500 font-medium">
                Step {step} of 3 — {step === 1 ? "Upload Statement" : step === 2 ? "Review & Assign Pools" : "Import Complete"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg text-lg font-bold transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center justify-between">
              <span>⚠️ {errorMessage}</span>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-rose-500 hover:text-rose-700 font-extrabold cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {step === 1 && (
            <CsvStepUpload
              fileName={fileName}
              targetBankAccountId={targetBankAccountId}
              setTargetBankAccountId={setTargetBankAccountId}
              bankAccounts={bankAccounts}
              isDragging={isDragging}
              handleDragOver={handleDragOver}
              handleDragLeave={handleDragLeave}
              handleDrop={handleDrop}
              handleFileUpload={handleFileUpload}
              isParsing={parseCsvMutation.isPending}
              showCustomMapper={showCustomMapper}
              rawHeaders={rawHeaders}
              dateColIndex={dateColIndex}
              setDateColIndex={setDateColIndex}
              descColIndex={descColIndex}
              setDescColIndex={setDescColIndex}
              amountColIndex={amountColIndex}
              setAmountColIndex={setAmountColIndex}
              handleApplyCustomMapping={handleApplyCustomMapping}
            />
          )}

          {step === 2 && parsedData && (
            <CsvStepReview
              parsedData={parsedData}
              targetBankAccountName={targetBankAccountName}
              selectedExpenses={selectedExpenses}
              selectedIncome={selectedIncome}
              netImpact={netImpact}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              filterType={filterType}
              setFilterType={setFilterType}
              filteredTransactions={filteredTransactions}
              allSelected={allSelected}
              handleToggleSelectAll={handleToggleSelectAll}
              selectedMap={selectedMap}
              setSelectedMap={setSelectedMap}
              poolMap={poolMap}
              setPoolMap={setPoolMap}
              creditActionMap={creditActionMap}
              setCreditActionMap={setCreditActionMap}
              includedMap={includedMap}
              setIncludedMap={setIncludedMap}
              noteMap={noteMap}
              setNoteMap={setNoteMap}
              categoryMapState={categoryMapState}
              setCategoryMapState={setCategoryMapState}
              categories={categories}
              flowTypeOverrideMap={flowTypeOverrideMap}
              setFlowTypeOverrideMap={setFlowTypeOverrideMap}
              getEffectiveFlowType={getEffectiveFlowType}
            />
          )}

          {step === 3 && commitResult && (
            <CsvStepComplete commitResult={commitResult} />
          )}
        </div>

        {/* Footer Controls */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
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
                disabled={commitCsvMutation.isPending || includedCount === 0}
                className="px-6 py-2 text-xs font-bold bg-[#2563eb] hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                {commitCsvMutation.isPending
                  ? "Importing Transactions..."
                  : `Confirm & Import (${includedCount})`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
