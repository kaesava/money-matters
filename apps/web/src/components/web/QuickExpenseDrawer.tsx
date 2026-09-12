import React from "react";
import { t } from "@money-matters/i18n";
import { SlideOverDrawer, PoolPicker, InfoTooltip, ConfirmDialog, Button, AmountField } from "@money-matters/ui/web";
import { useQuickActionState } from "./quick/useQuickActionState";
import { QuickPickBadges } from "./quick/QuickPickBadges";
import { CrossBankTransferModal } from "./CrossBankTransferModal";

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
    selectedSubCategoryId,
    setSelectedSubCategoryId,
    sourceCategoryId,
    setSourceCategoryId,
    destinationCategoryId,
    setDestinationCategoryId,
    receivingAccountId,
    setReceivingAccountId,
    date,
    setDate,
    todayStr,
    error,
    isIncome,
    isTransfer,
    isFutureDate,
    categories,
    bankAccounts,
    quickExpensePresets,
    quickIncomePresets,
    quickTransferPresets,
    handleSelectPreset,
    handleSubmit,
    executeSubmit,
    isPending,
    confirmState,
    setConfirmState,
    crossBankPrompt,
    setCrossBankPrompt,
  } = useQuickActionState(onClose, initialTab);

  const activePresets = isTransfer
    ? quickTransferPresets
    : isIncome
    ? quickIncomePresets
    : quickExpensePresets;

  const titleText = isTransfer
    ? "Transfer Between Pools"
    : isIncome
    ? t("drawers.quickExpense.oneOffIncome", { defaultValue: "One-off Income" })
    : t("drawers.quickExpense.oneOffExpense", { defaultValue: "One-off Expense" });

  const infoContent = isTransfer
    ? "Reallocate money directly between virtual pools (e.g., moving surplus from Everyday to a Goal pool, or adjusting bill reserves)."
    : isIncome
    ? "Log unexpected income, cash deposits, or side hustle earnings. Funds are added to your Everyday pool or allocated via payday waterfall."
    : "Log an out-of-pocket spend. Money Matters deducts this from your Everyday pool balance so your bill buffer and savings goals stay 100% protected.";

  const isDirty = name.trim() !== "" || amount.trim() !== "" || categoryId !== "";

  return (
    <>
      <SlideOverDrawer
        title={
          <div className="flex items-center gap-2">
            <span>{titleText}</span>
            <InfoTooltip title={titleText} content={infoContent} />
          </div>
        }
        onClose={onClose}
        isDirty={isDirty}
        widthClass="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
            {/* 3-Way Segmented Control */}
            {/* 3-Way Segmented Control */}
              <div className="flex rounded-xl bg-zinc-100 p-1">
                <button
                  type="button"
                  onClick={() => handleTabChange("DEBIT")}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    type === "DEBIT" ? "bg-white text-[#2563eb] shadow-xs" : "text-zinc-500 hover:text-zinc-800"
                  }`}
                >
                  <span>{t("drawers.quickExpense.tabExpense", { defaultValue: "Expense" })}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTabChange("CREDIT")}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    type === "CREDIT" ? "bg-white text-emerald-700 shadow-xs" : "text-zinc-500 hover:text-zinc-800"
                  }`}
                >
                  <span>{t("drawers.quickExpense.tabIncome", { defaultValue: "Income" })}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTabChange("TRANSFER")}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    type === "TRANSFER" ? "bg-white text-indigo-700 shadow-xs" : "text-zinc-500 hover:text-zinc-800"
                  }`}
                >
                  <span>{t("drawers.quickExpense.tabTransfer", { defaultValue: "Transfer" })}</span>
                </button>
              </div>

              {/* Quick Pick Badges (Recent & Frequent) */}
              <QuickPickBadges
                recentPresets={activePresets.recent}
                frequentPresets={activePresets.frequent}
                onSelect={handleSelectPreset}
              />

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
                      From Pool (Source)
                    </label>
                    <PoolPicker
                      pools={categories.map((p) => ({
                        id: p.id,
                        name: p.name,
                        poolType: p.type || p.poolType,
                        currentBalance: p.currentBalance,
                        isPrivate: p.isPrivate ?? undefined,
                      }))}
                      selectedPoolId={sourceCategoryId || null}
                      allowCategorySelection={false}
                      placeholder="Select Source Pool..."
                      showBalance={true}
                      onChange={(sel) => setSourceCategoryId(sel.poolId)}
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-500">
                      To Pool (Destination)
                    </label>
                    <PoolPicker
                      pools={categories.map((p) => ({
                        id: p.id,
                        name: p.name,
                        poolType: p.type || p.poolType,
                        currentBalance: p.currentBalance,
                        isPrivate: p.isPrivate ?? undefined,
                      }))}
                      selectedPoolId={destinationCategoryId || null}
                      allowCategorySelection={false}
                      placeholder="Select Destination Pool..."
                      showBalance={true}
                      onChange={(sel) => setDestinationCategoryId(sel.poolId)}
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
                        {t("drawers.quickExpense.category", { defaultValue: "Pool" })}
                      </label>
                      <PoolPicker
                        pools={categories.map((p) => ({
                          id: p.id,
                          name: p.name,
                          poolType: p.type || p.poolType,
                          currentBalance: p.currentBalance,
                          isPrivate: p.isPrivate ?? undefined,
                          categories: p.categories,
                        }))}
                        selectedPoolId={categoryId || null}
                        selectedCategoryId={selectedSubCategoryId || null}
                        allowCategorySelection={true}
                        placeholder="Select Pool or Category..."
                        showBalance={true}
                        onChange={(sel) => {
                          setCategoryId(sel.poolId);
                          setSelectedSubCategoryId(sel.categoryId);
                        }}
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
                        {bankAccounts.map((a: { id: string; name: string }) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}

              <div className="grid grid-cols-2 gap-3 items-end">
                <AmountField
                  label="Amount ($ AUD)"
                  required
                  value={amount}
                  onChange={setAmount}
                />

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-500">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    min={isTransfer ? todayStr : undefined}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="px-3.5 py-2.5 text-xs font-medium rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs font-bold text-zinc-600 hover:bg-zinc-100 rounded-xl transition-all"
                >
                  {t("common.cancel", { defaultValue: "Cancel" })}
                </button>
                {isIncome && (
                  <button
                    type="button"
                    disabled={isPending || !amount.trim() || parseFloat(amount) <= 0}
                    onClick={() => executeSubmit(false, true)}
                    className="px-4 py-2.5 text-xs font-bold text-[#2563eb] hover:text-blue-800 underline cursor-pointer disabled:opacity-50 transition-all"
                  >
                    {t("common.saveOnly", { defaultValue: "Save Only" })}
                  </button>
                )}
                <Button
                  type="submit"
                  loading={isPending}
                  disabled={!amount.trim() || parseFloat(amount) <= 0 || (isTransfer ? (!sourceCategoryId || !destinationCategoryId) : (!isIncome && !categoryId))}
                  variant="primary"
                >
                  {isTransfer
                    ? isFutureDate
                      ? t("common.saveOnly", { defaultValue: "Save Only" })
                      : t("common.transfer", { defaultValue: "Transfer" })
                    : isIncome
                    ? t("common.splitIncome", { defaultValue: "Split Income" })
                    : isFutureDate
                    ? t("common.saveOnly", { defaultValue: "Save Only" })
                    : t("common.markSpent", { defaultValue: "Mark Spent" })}
                </Button>
              </div>
        </form>


        {confirmState && (
          <ConfirmDialog
            isOpen={confirmState.isOpen}
            onClose={() => setConfirmState(null)}
            onConfirm={confirmState.onConfirm}
            title={confirmState.title}
            description={confirmState.description}
            confirmLabel={t("common.proceed", { defaultValue: "Proceed" })}
            variant="warning"
          />
        )}
      </SlideOverDrawer>

      {crossBankPrompt && (
        <CrossBankTransferModal
          isOpen={!!crossBankPrompt}
          onClose={() => {
            setCrossBankPrompt(null);
            onClose();
          }}
          {...crossBankPrompt}
        />
      )}
    </>
  );
}


export { QuickActionDrawer as QuickExpenseDrawer };
