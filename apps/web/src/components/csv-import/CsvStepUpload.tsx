"use client";

import React from "react";
import { Spinner } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";

export interface BankAccountOption {
  id: string;
  name: string;
  categoryTypes?: string[];
  poolTypes?: string[];
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
      {/* Target Account Selection */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
        <label className="block text-xs font-bold uppercase text-slate-500 mb-2">
          {t("csvImport.upload.selectTargetAccount", { defaultValue: "Select Target Bank Account" })}
        </label>
        <select
          value={targetBankAccountId}
          onChange={(e) => setTargetBankAccountId(e.target.value)}
          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
        >
          {bankAccounts.map((acc) => {
            const types = acc.poolTypes || acc.categoryTypes || [];
            return (
              <option key={acc.id} value={acc.id}>
                {acc.name} ({types.join(", ") || "Primary"})
              </option>
            );
          })}
        </select>
      </div>

      {/* Drag & Drop File Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
          isDragging
            ? "border-[#2563eb] bg-blue-50/50"
            : "border-slate-300 hover:border-slate-400 bg-white"
        }`}
      >
        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#2563eb] flex items-center justify-center mx-auto mb-3 text-xl font-bold">
          📁
        </div>
        <h4 className="text-sm font-bold text-slate-800 mb-1">
          {fileName ? `Selected: ${fileName}` : t("csvImport.upload.dragDrop", { defaultValue: "Drag and drop your bank statement CSV here" })}
        </h4>
        <p className="text-xs text-slate-400 font-medium mb-4">
          {t("csvImport.upload.supportedBanks", { defaultValue: "Supports CommBank, NAB, ANZ, Westpac, ING, Macquarie, and generic CSV formats." })}
        </p>

        <label className="inline-flex items-center px-4 py-2 bg-[#2563eb] hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer">
          <span>{t("csvImport.upload.browseFiles", { defaultValue: "Browse Files" })}</span>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {/* Custom Column Mapper (Fallback if AI/regex parser needs manual column binding) */}
      {showCustomMapper && (
        <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-amber-900 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-base">⚙️</span>
            <span className="text-xs font-bold uppercase tracking-wider">
              {t("csvImport.upload.customMappingRequired", { defaultValue: "Custom CSV Column Mapping Required" })}
            </span>
          </div>
          <p className="text-xs text-amber-800 font-medium">
            {t("csvImport.upload.detectHeadersFailed", { defaultValue: "Could not automatically detect headers. Select which columns correspond to date, description, and amount." })}
          </p>

          <div className="grid grid-cols-3 gap-3 pt-1">
            <div>
              <label className="block text-[11px] font-bold text-amber-900 mb-1">{t("csvImport.upload.dateColumn", { defaultValue: "Date Column" })}</label>
              <select
                value={dateColIndex}
                onChange={(e) => setDateColIndex(Number(e.target.value))}
                className="w-full px-2 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-semibold"
              >
                {rawHeaders.map((h, idx) => (
                  <option key={idx} value={idx}>
                    Col {idx + 1}: {h || "(Empty)"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-amber-900 mb-1">{t("csvImport.upload.descColumn", { defaultValue: "Description Column" })}</label>
              <select
                value={descColIndex}
                onChange={(e) => setDescColIndex(Number(e.target.value))}
                className="w-full px-2 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-semibold"
              >
                {rawHeaders.map((h, idx) => (
                  <option key={idx} value={idx}>
                    Col {idx + 1}: {h || "(Empty)"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-amber-900 mb-1">{t("csvImport.upload.amountColumn", { defaultValue: "Amount Column" })}</label>
              <select
                value={amountColIndex}
                onChange={(e) => setAmountColIndex(Number(e.target.value))}
                className="w-full px-2 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-semibold"
              >
                {rawHeaders.map((h, idx) => (
                  <option key={idx} value={idx}>
                    Col {idx + 1}: {h || "(Empty)"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleApplyCustomMapping}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              {t("csvImport.upload.applyMapping", { defaultValue: "Apply Column Mapping" })}
            </button>
          </div>
        </div>
      )}

      {isParsing && (
        <div className="flex items-center justify-center p-6 text-slate-500 font-semibold text-xs gap-2">
          <Spinner />
          <span>{t("csvImport.upload.parsing", { defaultValue: "Parsing bank statement CSV..." })}</span>
        </div>
      )}
    </div>
  );
}
