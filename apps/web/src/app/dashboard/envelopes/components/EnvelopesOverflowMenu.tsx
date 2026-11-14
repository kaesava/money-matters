"use client";

import React, { useRef, useEffect } from "react";
import Link from "next/link";
import { MoreVertical, ArrowDownCircle, ArrowUpCircle, ArrowRightLeft, TrendingUp, SlidersHorizontal } from "lucide-react";
import { t } from "@money-matters/i18n";

interface EnvelopesOverflowMenuProps {
  overflowMenuOpen: boolean;
  setOverflowMenuOpen: (open: boolean) => void;
  showProjectionMatrix: boolean;
  setShowProjectionMatrix: (val: boolean) => void;
  onQuickAction: (tab: "DEBIT" | "CREDIT" | "TRANSFER") => void;
}

/**
 * Overflow actions menu for the Envelopes dashboard page.
 */
export function EnvelopesOverflowMenu({
  overflowMenuOpen,
  setOverflowMenuOpen,
  showProjectionMatrix,
  setShowProjectionMatrix,
  onQuickAction,
}: EnvelopesOverflowMenuProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOverflowMenuOpen(false);
      }
    }
    if (overflowMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [overflowMenuOpen, setOverflowMenuOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOverflowMenuOpen(!overflowMenuOpen)}
        className="p-2.5 rounded-xl font-bold text-xs bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 transition-all border border-zinc-200 dark:border-zinc-700 flex items-center justify-center cursor-pointer"
        aria-label="Actions"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {overflowMenuOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl py-1.5 z-50">
          <button
            type="button"
            onClick={() => {
              setOverflowMenuOpen(false);
              onQuickAction("DEBIT");
            }}
            className="w-full px-3.5 py-2 text-left text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2.5 transition-colors cursor-pointer"
          >
            <ArrowDownCircle className="w-4 h-4 text-emerald-600" />
            <span>{t("categories.actions.quickExpense")}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setOverflowMenuOpen(false);
              onQuickAction("CREDIT");
            }}
            className="w-full px-3.5 py-2 text-left text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2.5 transition-colors cursor-pointer"
          >
            <ArrowUpCircle className="w-4 h-4 text-[#2563eb]" />
            <span>{t("categories.actions.quickIncome")}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setOverflowMenuOpen(false);
              onQuickAction("TRANSFER");
            }}
            className="w-full px-3.5 py-2 text-left text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2.5 transition-colors cursor-pointer"
          >
            <ArrowRightLeft className="w-4 h-4 text-[#2563eb]" />
            <span>{t("categories.actions.moveMoney")}</span>
          </button>
          <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1" />
          <Link
            href="/setup?mode=rerun"
            onClick={() => setOverflowMenuOpen(false)}
            className="w-full px-3.5 py-2 text-left text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2.5 transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4 text-[#2563eb]" />
            <span>{t("categories.recalibrateBudget")}</span>
          </Link>
          <button
            type="button"
            onClick={() => {
              setOverflowMenuOpen(false);
              setShowProjectionMatrix(!showProjectionMatrix);
            }}
            className="w-full px-3.5 py-2 text-left text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2.5 transition-colors cursor-pointer"
          >
            <TrendingUp className="w-4 h-4 text-purple-600" />
            <span>
              {showProjectionMatrix
                ? t("categories.actions.exitProjection")
                : t("categories.actions.futureProjection")}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
