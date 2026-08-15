"use client";

import React, { useState } from "react";
import { trpc } from "../lib/trpc";
import { Spinner } from "@money-matters/ui/web";

interface ParsedTx {
  date: string;
  description: string;
  suggestedCategoryName?: string | null;
  flowType: "CREDIT" | "DEBIT";
  amount: string;
}

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [fileName, setFileName] = useState<string>("");
  const [parsedResults, setParsedResults] = useState<{
    bank: string;
    transactions: ParsedTx[];
  } | null>(null);

  const parseCsvMutation = trpc.parseCsv.useMutation({
    onSuccess: (data: { bank: string; transactions: ParsedTx[] }) => {
      setParsedResults(data);
    },
  });

  const [isDragging, setIsDragging] = useState(false);
  const [categoryOverrides, setCategoryOverrides] = useState<Record<number, string>>({});

  const categoriesQuery = trpc.listCategories.useQuery(undefined, { enabled: isOpen });
  const categories = categoriesQuery.data ?? [];

  if (!isOpen) return null;

  const processFile = (file: File) => {
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      parseCsvMutation.mutate({ csvText: text });
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
    if (file && file.name.endsWith('.csv')) {
      processFile(file);
    }
  };

  const handleConfirmImport = () => {
    if (onSuccess) onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Import Bank CSV Statement</h3>
            <p className="text-xs text-slate-500">Supports CBA, Westpac, ANZ, NAB, ING, Macquarie</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {parseCsvMutation.isPending ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Spinner size="lg" className="text-[#00B4A6]" />
              <span className="text-sm font-semibold text-slate-500">Parsing statement...</span>
            </div>
          ) : !parsedResults ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                isDragging
                  ? "border-blue-600 bg-blue-50/50 scale-[1.01]"
                  : "border-slate-300 hover:border-blue-500"
              }`}
            >
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                id="csv-file-input"
              />
              <label
                htmlFor="csv-file-input"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <span className="text-3xl">{isDragging ? "📥" : "📄"}</span>
                <span className="font-semibold text-slate-700">
                  {fileName ? fileName : isDragging ? "Drop CSV statement file here" : "Click to select or drag & drop CSV statement"}
                </span>
                <span className="text-xs text-slate-400">
                  Statements exported from your bank app or online banking
                </span>
              </label>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-blue-50 px-4 py-3 rounded-lg border border-blue-100">
                <span className="text-sm font-semibold text-blue-900">
                  Detected: {parsedResults.bank}
                </span>
                <span className="text-xs font-bold bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full">
                  {parsedResults.transactions.length} Transactions
                </span>
              </div>

              <div className="border rounded-xl overflow-hidden max-h-64 overflow-y-auto text-sm">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-600 font-semibold text-xs uppercase sticky top-0">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Description</th>
                      <th className="p-3">Category Re-assignment</th>
                      <th className="p-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-xs">
                    {parsedResults.transactions.map((tx, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3 font-sans text-slate-500 whitespace-nowrap">{tx.date}</td>
                        <td className="p-3 font-sans font-medium text-slate-800 truncate max-w-xs">{tx.description}</td>
                        <td className="p-3 font-sans">
                          <select
                            value={categoryOverrides[idx] ?? tx.suggestedCategoryName ?? "EVERYDAY_POOL"}
                            onChange={(e) =>
                              setCategoryOverrides((prev) => ({
                                ...prev,
                                [idx]: e.target.value,
                              }))
                            }
                            className="px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white font-semibold text-slate-700"
                          >
                            <option value="EVERYDAY_POOL">Everyday Pool</option>
                            {categories.map((c) => (
                              <option key={c.id} value={c.name}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className={`p-3 text-right font-bold tabular-nums ${tx.flowType === 'CREDIT' ? 'text-green-600' : 'text-slate-900'}`}>
                          {tx.flowType === 'CREDIT' ? '+' : '-'}${tx.amount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            Cancel
          </button>
          {parsedResults && (
            <button
              onClick={handleConfirmImport}
              className="px-6 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow transition-colors"
            >
              Confirm & Import ({parsedResults.transactions.length})
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
