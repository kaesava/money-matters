"use client";

import React from "react";
import { Spinner } from "@money-matters/ui/web";

export interface BankAccountOption {
  id: string;
  name: string;
  categoryTypes: string[];
}

export interface CsvStepUploadProps {
  bankAccounts: BankAccountOption[];
  targetBankAccountId: string;
  setTargetBankAccountId: (id: string) => void;
  isParsing: boolean;
  isDragging: boolean;
  fileName: string;
  showCustomMapper: boolean;
  rawHeaders: string[];
  dateColIndex: number;
  setDateColIndex: (val: number) => void;
  descColIndex: number;
  setDescColIndex: (val: number) => void;
  amountColIndex: number;
  setAmountColIndex: (val: number) => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleApplyCustomMapping: () => void;
}

export function CsvStepUpload({
  bankAccounts,
  targetBankAccountId,
  setTargetBankAccountId,
  isParsing,
  isDragging,
  fileName,
  showCustomMapper,
  rawHeaders,
  dateColIndex,
  setDateColIndex,
  descColIndex,
  setDescColIndex,
  amountColIndex,
  setAmountColIndex,
  handleFileUpload,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  handleApplyCustomMapping,
}: CsvStepUploadProps) {
  return (
    <div className="space-y-6">
      {/* Target Bank Account Selection */}
      <div className="flex flex-col gap-1.5 p-4 rounded-xl bg-slate-50 border border-slate-200">
        <label className="text-xs font-bold text-[#1B2B4B]">Target Bank Account for Import:</label>
        <select
          value={targetBankAccountId}
          onChange={(e) => setTargetBankAccountId(e.target.value)}
          className="px-3 py-2 text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-800 focus:ring-2 focus:ring-[#2563eb]"
        >
          {bankAccounts.map((acc) => (
            <option key={acc.id} value={acc.id}>
              {acc.name} ({acc.categoryTypes.join(", ") || "Unlinked"})
            </option>
          ))}
        </select>
      </div>

      {isParsing ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Spinner size="lg" className="text-[#2563eb]" />
          <span className="text-sm font-bold text-slate-600">Parsing statement & checking duplicates...</span>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all ${
            isDragging
              ? "border-[#2563eb] bg-blue-50/50 scale-[1.01]"
              : "border-slate-300 hover:border-[#2563eb] bg-slate-50/50"
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
                className="w-full p-2 text-xs border rounded-lg bg-white font-semibold"
              >
                {rawHeaders.map((h, i) => {
                  const lower = (h || "").toLowerCase();
                  const isDateCand = lower.includes("date") || lower.includes("time") || lower.includes("day");
                  return (
                    <option key={i} value={i}>
                      {isDateCand ? "📅 " : ""}{h || `Col ${i + 1}`}{isDateCand ? " (Recommended)" : ""}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-600">Description Column:</label>
              <select
                value={descColIndex}
                onChange={(e) => setDescColIndex(Number(e.target.value))}
                className="w-full p-2 text-xs border rounded-lg bg-white font-semibold"
              >
                {rawHeaders.map((h, i) => {
                  const lower = (h || "").toLowerCase();
                  const isDescCand = lower.includes("desc") || lower.includes("narrative") || lower.includes("memo") || lower.includes("detail") || lower.includes("payee");
                  return (
                    <option key={i} value={i}>
                      {isDescCand ? "📝 " : ""}{h || `Col ${i + 1}`}{isDescCand ? " (Recommended)" : ""}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-600">Amount Column:</label>
              <select
                value={amountColIndex}
                onChange={(e) => setAmountColIndex(Number(e.target.value))}
                className="w-full p-2 text-xs border rounded-lg bg-white font-semibold"
              >
                {rawHeaders.map((h, i) => {
                  const lower = (h || "").toLowerCase();
                  const isAmountCand = lower.includes("amount") || lower.includes("debit") || lower.includes("credit") || lower.includes("sum") || lower.includes("val");
                  return (
                    <option key={i} value={i}>
                      {isAmountCand ? "💲 " : ""}{h || `Col ${i + 1}`}{isAmountCand ? " (Recommended)" : ""}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleApplyCustomMapping}
              className="px-4 py-2 text-xs font-bold text-white bg-[#2563eb] hover:bg-blue-700 rounded-lg shadow-xs"
            >
              Apply Column Mapping & Parse
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
