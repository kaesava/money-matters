"use client";
import React, { useState } from "react";
import { t } from "@money-matters/i18n";
import { SlideOverDrawer } from "@money-matters/ui/web";
import { trpc } from "../../lib/trpc";

interface QuickExpenseDrawerProps {
  onClose: () => void;
}

/** Quick expense entry in a SlideOverDrawer. Port of mobile QuickExpenseModal. */
export function QuickExpenseDrawer({ onClose }: QuickExpenseDrawerProps) {
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const categoriesQuery = trpc.listCategories.useQuery();
  const recordExpenseMutation = trpc.recordExpense.useMutation({
    onSuccess: () => {
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1200);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const categories = categoriesQuery.data ?? [];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      setError(t("transactions.newExpense.amountLabel") + " is required and must be positive.");
      return;
    }
    if (!categoryId) {
      setError(t("transactions.newExpense.categoryLabel") + " is required.");
      return;
    }

    // Convert dollars to cents string for the API
    const amountCents = (amountNum * 100).toFixed(0);

    recordExpenseMutation.mutate({
      categoryId,
      amount: amountCents,
      note: note || undefined,
      idempotencyKey: `expense-web-${Date.now()}-${Math.random()}`,
    });
  }

  return (
    <SlideOverDrawer
      title={t("transactions.newExpense.title")}
      onClose={onClose}
      widthClass="max-w-sm"
    >
      <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
        {success ? (
          <div
            className="flex flex-col items-center gap-3 py-12 text-center"
            style={{ color: "var(--dash-success)" }}
          >
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-base font-bold">{t("transactions.newExpense.successMessage")}</p>
          </div>
        ) : (
          <>
            {error && (
              <div
                className="text-sm font-semibold px-3 py-2 rounded-lg"
                style={{ backgroundColor: "rgba(239,68,68,0.08)", color: "var(--dash-critical)" }}
              >
                {error}
              </div>
            )}

            {/* Amount */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--dash-muted)" }}>
                {t("transactions.newExpense.amountLabel")}
              </label>
              <div className="relative">
                <span
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold"
                  style={{ color: "var(--dash-muted)" }}
                >
                  $
                </span>
                <input
                  id="expense-amount-input"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0.01"
                  placeholder={t("transactions.newExpense.amountPlaceholder")}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-7 pr-4 py-2.5 rounded-xl border text-sm font-semibold focus:outline-none focus:ring-2 transition-all"
                  style={{
                    border: "1px solid var(--dash-border)",
                    backgroundColor: "var(--dash-surface)",
                    color: "var(--dash-text)",
                  }}
                  disabled={recordExpenseMutation.isPending}
                  autoFocus
                />
              </div>
            </div>

            {/* Category */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--dash-muted)" }}>
                {t("transactions.newExpense.categoryLabel")}
              </label>
              {categoriesQuery.isLoading ? (
                <div className="h-10 rounded-xl animate-pulse" style={{ backgroundColor: "var(--dash-border)" }} />
              ) : (
                <select
                  id="expense-category-select"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 transition-all"
                  style={{
                    border: "1px solid var(--dash-border)",
                    backgroundColor: "var(--dash-surface)",
                    color: categoryId ? "var(--dash-text)" : "var(--dash-muted)",
                  }}
                  disabled={recordExpenseMutation.isPending}
                >
                  <option value="">{t("transactions.newExpense.categoryPlaceholder")}</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Note */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--dash-muted)" }}>
                {t("transactions.newExpense.noteLabel")}{" "}
                <span className="normal-case font-normal">{t("common.optional")}</span>
              </label>
              <input
                id="expense-note-input"
                type="text"
                placeholder={t("transactions.newExpense.notePlaceholder")}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all"
                style={{
                  border: "1px solid var(--dash-border)",
                  backgroundColor: "var(--dash-surface)",
                  color: "var(--dash-text)",
                }}
                disabled={recordExpenseMutation.isPending}
              />
            </div>

            {/* Submit */}
            <button
              id="record-expense-submit-btn"
              type="submit"
              disabled={recordExpenseMutation.isPending}
              className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
              style={{ backgroundColor: "var(--dash-teal)" }}
            >
              {recordExpenseMutation.isPending
                ? t("transactions.newExpense.submitting")
                : t("transactions.newExpense.submitCta")}
            </button>
          </>
        )}
      </form>
    </SlideOverDrawer>
  );
}
