import React from "react";
import {
  Sparkles,
  ArrowRight,
  CornerDownLeft,
  CreditCard,
  Mail,
  Calendar,
  Receipt,
  ExternalLink,
  ChevronRight,
  Compass,
} from "lucide-react";
import { t } from "@money-matters/i18n";
import { fmtDate } from "../dates/date-formatting";
import type {
  SearchResultAccount,
  SearchResultEnvelope,
  SearchResultEvent,
  SearchResultPage,
  SearchResultTransaction,
} from "../hooks/useCommandPaletteState";

export type PaletteActionItem =
  | { kind: "quick_jump"; label: string; sublabel: string; onSelect: () => void }
  | { kind: "page"; item: SearchResultPage }
  | { kind: "ai_ask"; query: string; isPrioritized?: boolean }
  | { kind: "account"; item: SearchResultAccount }
  | { kind: "envelope"; item: SearchResultEnvelope }
  | { kind: "event"; item: SearchResultEvent }
  | { kind: "transaction"; item: SearchResultTransaction }
  | { kind: "view_all_transactions"; query: string };

export function CommandPaletteActionRow({
  action,
  flatIndex,
  isSelected,
  formatAmount,
  locale,
  timeZone,
  onSelect,
}: {
  action: PaletteActionItem;
  flatIndex: number;
  isSelected: boolean;
  formatAmount: (amount: number) => string;
  locale: string;
  timeZone?: string;
  onSelect: (action: PaletteActionItem) => void;
}) {
  const rowClass = `w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left text-sm transition-colors ${
    isSelected
      ? "bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100"
      : "hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200"
  }`;

  if (action.kind === "quick_jump" || action.kind === "page") {
    const label = action.kind === "quick_jump" ? action.label : action.item.title;
    const sublabel = action.kind === "quick_jump" ? action.sublabel : action.item.subtitle;
    const isPage = action.kind === "page";
    return (
      <button data-palette-idx={flatIndex} onClick={() => onSelect(action)} className={rowClass}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
            {isPage ? <Compass className="w-4 h-4" /> : <ExternalLink className="w-4 h-4" />}
          </div>
          <div>
            <div className="font-medium">{label}</div>
            {sublabel ? <div className="text-xs text-slate-400">{sublabel}</div> : null}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-400" />
      </button>
    );
  }

  if (action.kind === "ai_ask") {
    return (
      <button data-palette-idx={flatIndex} onClick={() => onSelect(action)} className={rowClass}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="font-medium flex items-center gap-1.5">
              <span>{t("commandPalette.askPennyPrefix")}:</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">&ldquo;{action.query}&rdquo;</span>
            </div>
            <div className="text-xs text-slate-400">
              {t(action.isPrioritized ? "commandPalette.askPennyHint" : "commandPalette.askPennyTabHint")}
            </div>
          </div>
        </div>
        <CornerDownLeft className="w-4 h-4 text-slate-400" />
      </button>
    );
  }

  if (action.kind === "account" || action.kind === "envelope") {
    const isAccount = action.kind === "account";
    return (
      <button data-palette-idx={flatIndex} onClick={() => onSelect(action)} className={rowClass}>
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isAccount
                ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400"
                : "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
            }`}
          >
            {isAccount ? <CreditCard className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
          </div>
          <div>
            <div className="font-medium">{action.item.name}</div>
            <div className="text-xs text-slate-400">
              {t(isAccount ? "commandPalette.sections.accounts" : "commandPalette.sections.envelopes")}
              {action.item.type ? ` · ${action.item.type}` : ""}
            </div>
          </div>
        </div>
        {action.item.currentBalance !== undefined && (
          <div className="font-mono text-sm font-medium tabular-nums text-slate-900 dark:text-slate-100">
            {formatAmount(action.item.currentBalance)}
          </div>
        )}
      </button>
    );
  }

  if (action.kind === "event") {
    const isIncome = action.item.type === "INCOME";
    return (
      <button data-palette-idx={flatIndex} onClick={() => onSelect(action)} className={rowClass}>
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isIncome
                ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400"
                : "bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400"
            }`}
          >
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <div className="font-medium">{action.item.name}</div>
            <div className="text-xs text-slate-400">
              {fmtDate(action.item.dueDate, timeZone, locale)} · {isIncome ? t("common.income") : t("common.expense")}
            </div>
          </div>
        </div>
        <div
          className={`font-mono text-sm font-medium tabular-nums ${
            isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-slate-900 dark:text-slate-100"
          }`}
        >
          {isIncome ? "+" : "-"}
          {formatAmount(action.item.amount)}
        </div>
      </button>
    );
  }

  if (action.kind === "transaction") {
    const isOutflow = action.item.flowType === "OUTFLOW";
    return (
      <button data-palette-idx={flatIndex} onClick={() => onSelect(action)} className={rowClass}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
            <Receipt className="w-4 h-4" />
          </div>
          <div>
            <div className="font-medium">{action.item.note || t("commandPalette.sections.transactions")}</div>
            <div className="text-xs text-slate-400">
              {action.item.envelopeName ? `${action.item.envelopeName} · ` : ""}
              {fmtDate(action.item.recordedAt, timeZone, locale)}
            </div>
          </div>
        </div>
        <div
          className={`font-mono text-sm font-medium tabular-nums ${
            isOutflow ? "text-slate-900 dark:text-slate-100" : "text-emerald-600 dark:text-emerald-400"
          }`}
        >
          {isOutflow ? "-" : "+"}
          {formatAmount(action.item.amount)}
        </div>
      </button>
    );
  }

  return (
    <button
      data-palette-idx={flatIndex}
      onClick={() => onSelect(action)}
      className={`w-full flex items-center justify-center gap-2 py-3 text-xs font-semibold text-blue-600 dark:text-blue-400 transition-colors ${
        isSelected ? "bg-blue-50 dark:bg-blue-950/40" : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
      }`}
    >
      <span>{t("commandPalette.viewAllTransactions")}</span>
      <ArrowRight className="w-3.5 h-3.5" />
    </button>
  );
}
