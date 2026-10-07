"use client";

import React, { useState } from "react";
import { trpc } from "../../../../lib/trpc";
import { t } from "@money-matters/i18n";
import { PaginationBar, Spinner, InfoTooltip, SearchInput, SkeletonTable, ConfirmDialog, useToast } from "@money-matters/ui/web";

type ArchivedItemType = "POOL" | "CATEGORY" | "INCOME_SOURCE" | "EXPENSE_SOURCE" | "BANK_ACCOUNT";

interface ArchivedItem {
  id: string;
  name: string;
  itemType: string;
  subtitle?: string | null;
  archivedAt: string | Date | null;
}

export function ArchivedSection() {
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | ArchivedItemType>("ALL");

  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [itemToRestore, setItemToRestore] = useState<ArchivedItem | null>(null);

  const trpcUtils = trpc.useUtils();
  const archivedQuery = trpc.listArchivedItems.useQuery();
  const restoreMutation = trpc.restoreItem.useMutation({
    onSuccess: async () => {
      toast.success(t("settings.archived.restoreSuccess"));
      setItemToRestore(null);
      await Promise.all([
        archivedQuery.refetch(),
        trpcUtils.listPools.invalidate(),
        trpcUtils.listCategories.invalidate(),
        trpcUtils.listIncomeSources.invalidate(),
        trpcUtils.listExpenseSources.invalidate(),
        trpcUtils.listBankAccounts.invalidate(),
        trpcUtils.listBankAccountsWithExpected.invalidate(),
        trpcUtils.getMatrixProjectionData.invalidate(),
        trpcUtils.listTransactions.invalidate(),
      ]);
    },
    onError: (err) => {
      const msg = err.message.includes("parent pool is archived")
        ? t("settings.archived.orphanCategoryError")
        : err.message || t("common.errorTryAgain");
      toast.error(msg);
      setItemToRestore(null);
    },
  });

  const items = (archivedQuery.data ?? []) as ArchivedItem[];

  const filtered = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === "ALL" || item.itemType === filterType;
    return matchesSearch && matchesType;
  });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const getItemTypeBadge = (itemType: string) => {
    const typeKey = `settings.archived.types.${itemType}` as const;
    return t(typeKey) || itemType.replace("_", " ");
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-extrabold text-[#1B2B4B]">
          {t("settings.tabs.archived")}
        </h2>
        <InfoTooltip
          title={t("tooltips.archived.title")}
          content={t("tooltips.archived.content")}
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <SearchInput
          value={search}
          onChange={(val) => {
            setSearch(val);
            setPage(1);
          }}
          placeholder={t("settings.archived.searchPlaceholder")}
        />

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl flex-wrap">
          {(["ALL", "CATEGORY", "POOL", "INCOME_SOURCE", "EXPENSE_SOURCE", "BANK_ACCOUNT"] as const).map((type) => {
            const label =
              type === "ALL"
                ? t("common.all")
                : type === "CATEGORY"
                  ? t("settings.archived.categories")
                  : type === "POOL"
                    ? t("settings.archived.pools")
                    : type === "INCOME_SOURCE"
                      ? t("settings.archived.income")
                      : type === "EXPENSE_SOURCE"
                        ? t("settings.archived.expenses")
                        : t("settings.archived.accounts");

            return (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setFilterType(type);
                  setPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  filterType === type
                    ? "bg-white text-[#1B2B4B] shadow-xs font-extrabold"
                    : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content list */}
      {archivedQuery.isLoading ? (
        <SkeletonTable rows={3} cols={2} />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-2xl border border-zinc-200 shadow-xs gap-2">
          <p className="text-sm font-bold text-[#1B2B4B]">
            {t("settings.archived.emptyTitle")}
          </p>
          <p className="text-xs text-slate-500">
            {t("settings.archived.emptySubtitle")}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {paginated.map((item) => (
            <div
              key={`${item.itemType}-${item.id}`}
              className="flex items-center justify-between p-4 rounded-xl bg-white border border-zinc-200 shadow-xs"
            >
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[#1B2B4B]">{item.name}</span>
                  <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded bg-zinc-100 text-zinc-600">
                    {getItemTypeBadge(item.itemType)}
                  </span>
                </div>
                {item.archivedAt && (
                  <span className="text-xs text-slate-500 font-medium">
                    {t("settings.archived.archivedOn", {
                      date: new Intl.DateTimeFormat("en-AU", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        timeZone: "Australia/Sydney",
                      }).format(new Date(item.archivedAt)),
                    })}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setItemToRestore(item)}
                disabled={restoreMutation.isPending}
                className="px-3 py-1.5 rounded-xl border border-[#2563eb] text-[#2563eb] text-xs font-bold hover:bg-[#2563eb]/10 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {restoreMutation.isPending && restoreMutation.variables?.itemId === item.id && (
                  <Spinner size="sm" />
                )}
                {t("settings.archived.restoreAction")}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Footer */}
      {filtered.length >= 5 && (
        <PaginationBar
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filtered.length}
          pageSizeOptions={[10, 25, 50]}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}

      <ConfirmDialog
        isOpen={itemToRestore !== null}
        onClose={() => setItemToRestore(null)}
        onConfirm={() => {
          if (itemToRestore) {
            restoreMutation.mutate({
              itemId: itemToRestore.id,
              itemType: itemToRestore.itemType as ArchivedItemType,
            });
          }
        }}
        title={t("settings.archived.restoreTitle")}
        description={t("settings.archived.restoreConfirm", { name: itemToRestore?.name || "" })}
        confirmLabel={t("settings.archived.restoreAction")}
        variant="primary"
        isLoading={restoreMutation.isPending}
      />
    </div>
  );
}
