"use client";

import React from "react";
import { t } from "@money-matters/i18n";
import { trpc } from "../../../../lib/trpc";
import { InfoTooltip, SearchInput, RecordFilterBadge, PoolPicker } from "@money-matters/ui/web";
import { BankAccountTable, BankName } from "../../bank-accounts/components/BankAccountTable";
import { BankAccountFormModal } from "../../bank-accounts/components/BankAccountFormModal";
import { ReconciliationModal } from "../../../../components/ReconciliationModal";
import { QuickExpenseDrawer } from "../../../../components/web/QuickExpenseDrawer";
import { useLocale } from "../../../../providers/LocaleProvider";
import { useBankAccountsList } from "./useBankAccountsList";

const BANK_OPTIONS: Array<{ key: BankName; label: string; logoBg: string; textColor: string }> = [
  { key: "CBA", label: "Commonwealth Bank (CBA)", logoBg: "bg-amber-400", textColor: "text-zinc-950" },
  { key: "Westpac", label: "Westpac", logoBg: "bg-red-600", textColor: "text-white" },
  { key: "ANZ", label: "ANZ", logoBg: "bg-blue-600", textColor: "text-white" },
  { key: "NAB", label: "NAB", logoBg: "bg-red-700", textColor: "text-white" },
  { key: "ING", label: "ING", logoBg: "bg-orange-500", textColor: "text-white" },
  { key: "Macquarie", label: "Macquarie", logoBg: "bg-zinc-800", textColor: "text-white" },
  { key: "Other", label: "Other", logoBg: "bg-slate-500", textColor: "text-white" },
];

export function BankAccountsSection() {
  const { fmt } = useLocale();
  const fmtMoney = (val: string | number | undefined) => {
    const num = typeof val === "string" ? parseFloat(val) : typeof val === "number" ? val : 0;
    return fmt(num);
  };
  const utils = trpc.useUtils();

  const list = useBankAccountsList();

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-200">
      {/* Top Header inside tab */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-[#1B2B4B] flex items-center gap-2">
            <span>{t("settings.bankAccounts.title")}</span>
            <InfoTooltip
              title={t("tooltips.bankAccounts.title")}
              content={t("tooltips.bankAccounts.content")}
            />
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={list.openAddModal}
            className="px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-[#2563eb] hover:bg-blue-700 transition-all shadow-md flex items-center gap-2 cursor-pointer"
          >
            <span>{t("settings.bankAccounts.addAccount")}</span>
          </button>
        </div>
      </div>

      {/* Household Banking Optimizer banner when user has 1 or fewer bank accounts */}
      {list.accounts.length <= 1 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-xs font-black text-[#1B2B4B] flex items-center gap-1.5">
              <span>💡</span>
              <span>{t("bankAccounts.optimizerBannerTitle")}</span>
            </h3>
            <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
              {t("bankAccounts.optimizerBannerDesc")}
            </p>
          </div>
          <a
            href="/setup?mode=rerun"
            className="px-3.5 py-2 text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-xs shrink-0 self-start sm:self-center cursor-pointer"
          >
            {t("bankAccounts.optimizerBannerAction")}
          </a>
        </div>
      )}

      {list.errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center justify-between shadow-xs">
          <span>{list.errorMsg}</span>
          <button onClick={() => list.setErrorMsg(null)} className="text-rose-500 hover:text-rose-800 font-bold ml-2">
            ✕
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-zinc-200 shadow-xs">
        <SearchInput
          value={list.searchQuery}
          onChange={list.setSearchQuery}
          placeholder={t("settings.bankAccounts.searchPlaceholder")}
        />

        <div className="flex items-center gap-3">
          <div className="h-6 w-px bg-zinc-200 hidden sm:block" />
          <div className="w-64">
            <PoolPicker
              pools={list.pools.map((p) => ({
                id: p.id,
                name: p.name,
                poolType: p.poolType,
                currentBalance: p.currentBalance || 0,
              }))}
              showBalance={false}
              selectedPoolId={list.typeFilter === "ALL" ? null : list.typeFilter}
              allowCategorySelection={false}
              allowAllOption={true}
              placeholder={t("common.allPools")}
              onChange={(sel) => list.setTypeFilter(sel.poolId || "ALL")}
            />
          </div>
        </div>
      </div>

      {list.accountIdParam && (
        <div className="flex items-center gap-3 flex-wrap">
          <RecordFilterBadge
            label={list.matchedAccount ? `Filtered to Account: ${list.matchedAccount.name}` : "Filter: Item unavailable"}
            onClear={() => {
              const url = new URL(window.location.href);
              url.searchParams.delete("id");
              list.router.push(url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : ""));
            }}
          />
          {list.isAccountParamInvalid && (
            <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg font-medium">
              Requested item was not found or is archived. Showing all records.
            </span>
          )}
        </div>
      )}

      {/* Primary Bank Accounts Table */}
      <BankAccountTable
        accounts={list.paginated}
        page={list.page}
        totalPages={list.totalPages}
        pageSize={list.pageSize}
        totalItems={list.sorted.length}
        sortField={list.sortField}
        sortDir={list.sortDir}
        toggleSort={list.toggleSort}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        openEditModal={list.openEditModal}
        openAlignmentModal={list.handleDirectAlignment}
        fmtMoney={fmtMoney}
        isLoading={list.bankAccountsQuery.isLoading}
      />

      {/* Add / Edit Account Modal */}
      {list.isModalOpen && (
        <BankAccountFormModal
          isOpen={list.isModalOpen}
          editingAccount={list.editingAccount}
          accName={list.accName}
          setAccName={list.setAccName}
          accBankProvider={list.accBankProvider}
          setAccBankProvider={list.setAccBankProvider}
          accBalance={list.accBalance}
          setAccBalance={list.setAccBalance}
          accBuffer={list.accBuffer}
          setAccBuffer={list.setAccBuffer}
          accIsPrivate={list.accIsPrivate}
          setAccIsPrivate={list.setAccIsPrivate}
          isTrialExpired={list.isTrialExpired}
          isSaving={list.isSaving}
          bankOptions={BANK_OPTIONS}
          onClose={list.closeModal}
          onSubmit={list.handleSaveAccount}
          fmtMoney={fmtMoney}
          onArchive={list.editingAccount ? () => list.handleArchiveAccount(list.editingAccount!) : undefined}
          errorMsg={list.errorMsg}
        />
      )}

      {/* Reconciliation Modal */}
      {list.reconcileState && (
        <ReconciliationModal
          isOpen={!!list.reconcileState}
          onClose={() => list.setReconcileState(null)}
          accountName={list.reconcileState.account.name}
          expectedBalance={list.reconcileState.expectedBalance}
          newBalance={list.reconcileState.newBalance}
          unbudgetedBuffer={list.reconcileState.unbudgetedBuffer ?? 0}
          pools={list.reconcileState.linkedPools}
          onConfirm={list.handleConfirmReconcile}
          onOpenTransferModal={() => list.setMoveMoneyOpen(true)}
        />
      )}

      {/* Quick Action Drawer for Transfer capability */}
      {list.moveMoneyOpen && (
        <QuickExpenseDrawer
          onClose={() => {
            list.setMoveMoneyOpen(false);
            utils.listPools.invalidate();
          }}
          initialTab="TRANSFER"
        />
      )}
    </div>
  );
}
