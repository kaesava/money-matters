"use client";

import React, { useState } from "react";
import { trpc } from "../lib/trpc";

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
  const [fileContent, setFileContent] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [parsedResults, setParsedResults] = useState<{
    bank: string;
    transactions: any[];
  } | null>(null);

  const parseCsvMutation = trpc.transactions.parseCsv.useMutation({
    onSuccess: (data) => {
      setParsedResults(data);
    },
  });

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      setFileContent(text);
      parseCsvMutation.mutate({ csvText: text });
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = () => {
    // Perform bulk insertion or confirmation callback
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
          {!parsedResults ? (
            <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-8 text-center transition-colors">
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
                <span className="text-3xl">📄</span>
                <span className="font-semibold text-slate-700">
                  {fileName ? fileName : "Click to select or drag & drop CSV statement"}
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
                      <th className="p-3">Category Match</th>
                      <th className="p-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-xs">
                    {parsedResults.transactions.map((tx, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3 font-sans text-slate-500 whitespace-nowrap">{tx.date}</td>
                        <td className="p-3 font-sans font-medium text-slate-800 truncate max-w-xs">{tx.description}</td>
                        <td className="p-3 font-sans">
                          {tx.suggestedCategoryName ? (
                            <span className="bg-green-100 text-green-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                              {tx.suggestedCategoryName}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">Everyday Pool</span>
                          )}
                        </td>
                        <td className={`p-3 text-right font-bold ${tx.flowType === 'CREDIT' ? 'text-green-600' : 'text-slate-900'}`}>
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
