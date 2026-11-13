"use client";

import React from "react";
import { SearchInput } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";
import type { PoolTypeFilter } from "../hooks/useEnvelopesTableData";

export interface EnvelopesFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  typeFilter: PoolTypeFilter;
  onTypeFilterChange: (type: PoolTypeFilter) => void;
  privacyFilter: "ALL" | "SHARED" | "PRIVATE";
  onPrivacyFilterChange: (privacy: "ALL" | "SHARED" | "PRIVATE") => void;
}

import { useAppFeatures } from "../../../../hooks/useAppFeatures";

export function EnvelopesFilterBar({
  searchQuery,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  privacyFilter,
  onPrivacyFilterChange,
}: EnvelopesFilterBarProps) {
  const { hasPrivateMode } = useAppFeatures();

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-slate-50 border border-zinc-200/80 rounded-2xl">
      <div className="flex flex-col sm:flex-row items-center gap-3 flex-1 w-full">
        <SearchInput
          value={searchQuery}
          onChange={onSearchChange}
          placeholder={t("categories.searchPlaceholder")}
        />

        <div className="h-6 w-px bg-zinc-200 hidden sm:block" />

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center bg-white p-1 rounded-xl border border-zinc-200">
            {(["ALL", "EVERYDAY", "BILL", "GOAL"] as const).map((fType) => (
              <button
                key={fType}
                type="button"
                onClick={() => onTypeFilterChange(fType)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  typeFilter === fType
                    ? "bg-[#2563eb] text-white shadow-xs"
                    : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                {fType === "ALL"
                  ? t("common.all")
                  : fType === "EVERYDAY"
                  ? t("poolTypes.everyday")
                  : fType === "BILL"
                  ? t("poolTypes.bills")
                  : t("poolTypes.goals")}
              </button>
            ))}
          </div>

          {hasPrivateMode && (
            <>
              <div className="h-6 w-px bg-zinc-200 hidden sm:block" />

              <div className="flex items-center bg-white p-1 rounded-xl border border-zinc-200">
                {(["ALL", "SHARED", "PRIVATE"] as const).map((pType) => (
                  <button
                    key={pType}
                    type="button"
                    onClick={() => onPrivacyFilterChange(pType)}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      privacyFilter === pType
                        ? "bg-[#1B2B4B] text-white shadow-xs"
                        : "text-zinc-500 hover:text-zinc-800"
                    }`}
                  >
                    {pType === "ALL"
                      ? t("common.all")
                      : pType === "SHARED"
                      ? t("common.shared")
                      : t("common.private")}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
