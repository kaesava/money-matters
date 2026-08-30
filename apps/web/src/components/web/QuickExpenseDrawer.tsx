import React from "react";
import { t } from "@money-matters/i18n";
import { SlideOverDrawer, Spinner, SearchableCategorySelect, InfoTooltip, useIconVisibility, ConfirmDialog } from "@money-matters/ui/web";
import { useQuickActionState } from "./quick/useQuickActionState";
import { QuickPickBadges } from "./quick/QuickPickBadges";

export interface QuickActionDrawerProps {
  readonly onClose: () => void;
  readonly initialTab?: "DEBIT" | "CREDIT" | "TRANSFER";
}

export function QuickActionDrawer({ onClose, initialTab = "DEBIT" }: QuickActionDrawerProps) {
  const {
    type,
    handleTabChange,
    name,
    setName,
    amount,
    setAmount,
    categoryId,
    setCategoryId,
    sourceCategoryId,
    setSourceCategoryId,
    destinationCategoryId,
    setDestinationCategoryId,
    receivingAccountId,
    setReceivingAccountId,
    date,
    setDate,
    error,
    success,
    isIncome,
    isTransfer,
    categories,
    bankAccounts,
    quickExpensePresets,
    quickIncomePresets,
    quickTransferPresets,
    handleSelectPreset,
    handleSubmit,
    isPending,
    confirmState,
    setConfirmState,
  } = useQuickActionState(onClose, initialTab);


  const { showIcons } = useIconVisibility();

  const activePresets = isTransfer
    ? quickTransferPresets
    : isIncome
    ? quickIncomePresets
    : quickExpensePresets;

  const titleText = isTransfer
    ? "Transfer Between Categories"
    : isIncome
    ? "Quick Record Income"
    : "Quick Record Expense";

  const infoContent = isTransfer
    ? "Reallocate money directly between virtual pools (e.g., moving surplus from Everyday to a Goal pool, or adjusting bill reserves)."
    : isIncome
    ? "Log unexpected income, cash deposits, or side hustle earnings. Funds are added to your Everyday pool until your next scheduled payday cascade."
    : "Log an out-of-pocket spend. Money Matters deducts this from your Everyday pool balance so your bill buffer and savings goals stay 100% protected.";

  return (
    <SlideOverDrawer
      title={
        <div className="flex items-center gap-2">
          <span>{titleText}</span>
          <InfoTooltip title={titleText} content={infoContent} />
        </div>
      }
      onClose={onClose}
      widthClass="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
        {success ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center text-emerald-600">
            {showIcons && <span className="text-4xl">✅</span>}
            <p className="text-base font-bold">
              {isTransfer
                ? "Transfer completed successfully!"
                : isIncome
                ? "Income recorded successfully!"
                : "Expense recorded successfully!"}
            </p>
          </div>
        ) : (
          <>
            {/* 3-Way Segmented Control */}
            <div className="flex rounded-xl bg-zinc-100 p-1">
              <button
                type="button"
                onClick={() => handleTabChange("DEBIT")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  type === "DEBIT" ? "bg-white text-rose-700 shadow-xs" : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                {showIcons && <span>💸</span>}
                <span>{t("drawers.quickExpense.tabExpense", { defaultValue: "Expense" })}</span>
              </button>
              <button
                type="button"
                onClick={() => handleTabChange("CREDIT")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  type === "CREDIT" ? "bg-emerald-600 text-white shadow-xs" : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                {showIcons && <span>💰</span>}
                <span>{t("drawers.quickExpense.tabIncome", { defaultValue: "Income" })}</span>
              </button>
              <button
                type="button"
                onClick={() => handleTabChange("TRANSFER")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  type === "TRANSFER" ? "bg-blue-600 text-white shadow-xs" : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                {showIcons && <span>🔄</span>}
                <span>{t("drawers.quickExpense.tabTransfer", { defaultValue: "Transfer" })}</span>
              </button>
            </div>

            {/* Quick Pick Badges (Last 3 Saved) */}
            <QuickPickBadges presets={activePresets} onSelect={handleSelectPreset} />

            {error && (
              <div className="text-xs font-bold p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700">
                {error}
              </div>
            )}

            {isTransfer ? (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-500">
                    {t("drawers.quickExpense.transferName", { defaultValue: "Transfer Name" })}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Top up Everyday, Move to Savings"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="px-3.5 py-2.5 text-xs font-medium rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-500">
                    From Category (Source)
                  </label>
                  <SearchableCategorySelect
                    categories={categories}
                    value={sourceCategoryId}
                    onChange={setSourceCategoryId}
                    placeholder="Select Source Category..."
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-500">
                    To Category (Destination)
                  </label>
                  <SearchableCategorySelect
                    categories={categories}
                    value={destinationCategoryId}
                    onChange={setDestinationCategoryId}
                    placeholder="Select Destination Category..."
                  />
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-500">
                    {isIncome ? "Income Source / Description" : "Expense Name / Merchant"}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={isIncome ? "e.g., Freelance Work, Tax Refund" : "e.g., Woolworths, Shell Fuel"}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="px-3.5 py-2.5 text-xs font-medium rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                  />
                </div>

                {!isIncome && (
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-500">
                      {t("drawers.quickExpense.category", { defaultValue: "Category" })}
                    </label>
                    <SearchableCategorySelect
                      categories={categories}
                      value={categoryId}
                      onChange={setCategoryId}
                      placeholder="Select Category..."
                    />
                  </div>
                )}

                {isIncome && bankAccounts.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-500">
                      Bank Account (Optional)
                    </label>
                    <select
                      value={receivingAccountId}
                      onChange={(e) => setReceivingAccountId(e.target.value)}
                      className="px-3.5 py-2.5 text-xs font-medium rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                    >
                      <option value="">{t("drawers.quickExpense.defaultEverydayAccount", { defaultValue: "Default Everyday Account" })}</option>
                      {bankAccounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-500">
                  Amount ($ AUD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="px-3.5 py-2.5 text-xs font-mono font-bold rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-500">
                  Date
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="px-3.5 py-2.5 text-xs font-medium rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                />
              </div>

              {(() => {
                const isFuture = Boolean(date && new Date(date).setHours(0, 0, 0, 0) > new Date().setHours(0, 0, 0, 0));
                if (isFuture) {
                  return (
                    <div className="col-span-2 p-2.5 rounded-xl bg-blue-50/90 border border-blue-200 text-blue-900 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
                      <span className="text-base shrink-0">📅</span>
                      <div className="flex flex-col">
                        <span className="font-bold text-[#1B2B4B]">{t("drawers.quickExpense.scheduledPaydayWaterfall", { defaultValue: "Scheduled for Payday Waterfall" })}</span>
                        <span className="text-[11px] text-blue-700 font-medium">
                          This future {!isIncome ? "expense bill" : "income deposit"} will be included as an upcoming event in your payday allocation horizon.
                        </span>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-bold text-zinc-600 hover:bg-zinc-100 rounded-xl transition-all"
              >
                {t("common.cancel", { defaultValue: "Cancel" })}
              </button>
              <button
                type="submit"
                disabled={isPending}
                className={`px-5 py-2.5 text-xs font-bold text-white rounded-xl transition-all shadow-sm flex items-center gap-2 ${
                  isTransfer
                    ? "bg-blue-600 hover:bg-blue-700"
                    : isIncome
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {isPending && <Spinner size="sm" color="white" />}
                <span>
                  {isPending
                    ? (isTransfer ? "Recording Transfer..." : isIncome ? "Recording Income..." : "Recording Expense...")
                    : isTransfer
                    ? "Submit Transfer"
                    : isIncome
                    ? "Record Income"
                    : "Record Expense"}
                </span>
              </button>
            </div>

          </>
        )}
      </form>


      {confirmState && (
        <ConfirmDialog
          isOpen={confirmState.isOpen}
          onClose={() => setConfirmState(null)}
          onConfirm={confirmState.onConfirm}
          title={confirmState.title}
          description={confirmState.description}
          confirmLabel="Proceed"
          variant="warning"
        />
      )}
    </SlideOverDrawer>
  );
}


export { QuickActionDrawer as QuickExpenseDrawer };
