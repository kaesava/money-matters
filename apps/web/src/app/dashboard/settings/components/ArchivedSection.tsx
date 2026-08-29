"use client";

import React, { useState } from "react";
import { trpc } from "../../../../lib/trpc";
import { t } from "@money-matters/i18n";
import { PaginationBar, Spinner, InfoTooltip, SearchInput } from "@money-matters/ui/web";

export function ArchivedSection() {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "CATEGORY" | "INCOME_SOURCE" | "EXPENSE_SOURCE" | "BANK_ACCOUNT">("ALL");

  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const archivedQuery = trpc.listArchivedItems.useQuery();
  const restoreMutation = trpc.restoreItem.useMutation({
    onSuccess: () => {
      archivedQuery.refetch();
    },
  });

  const items = archivedQuery.data ?? [];

  const filtered = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === "ALL" || item.itemType === filterType;
    return matchesSearch && matchesType;
  });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-extrabold text-[#1B2B4B]">Archived Data</h2>
        <InfoTooltip
          title={t("tooltips.archived.title")}
          content={t("tooltips.archived.content")}
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search */}
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search archived categories or bills..."
        />

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl">
          {(["ALL", "CATEGORY", "INCOME_SOURCE", "EXPENSE_SOURCE", "BANK_ACCOUNT"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                filterType === type
                  ? "bg-white text-[#1B2B4B] shadow-xs font-extrabold"
                  : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              {type === "ALL" ? "All" : type === "CATEGORY" ? "Categories" : type === "INCOME_SOURCE" ? "Income" : type === "EXPENSE_SOURCE" ? "Expenses" : "Accounts"}
            </button>
          ))}
        </div>
      </div>

      {/* Content list */}
      {archivedQuery.isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl animate-pulse bg-zinc-100" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-2xl border border-zinc-200 shadow-xs gap-2">
          <span className="text-3xl">📦</span>
          <p className="text-sm font-bold text-[#1B2B4B]">No archived data found</p>
          <p className="text-xs text-slate-500">Categories, bills, and accounts you soft-delete will appear here for restoration.</p>
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
                    {item.itemType.replace("_", " ")}
                  </span>
                </div>
                {item.subtitle && (
                  <span className="text-xs text-slate-500 font-medium">{item.subtitle}</span>
                )}
              </div>

              <button
                type="button"
                onClick={() =>
                  restoreMutation.mutate({
                    itemId: item.id,
                    itemType: item.itemType as "CATEGORY" | "INCOME_SOURCE" | "EXPENSE_SOURCE" | "BANK_ACCOUNT",
                  })
                }
                disabled={restoreMutation.isPending}
                className="px-3 py-1.5 rounded-xl border border-[#00B4A6] text-[#00B4A6] text-xs font-bold hover:bg-[#00B4A6]/10 active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                {restoreMutation.isPending && restoreMutation.variables?.itemId === item.id && (
                  <Spinner size="sm" />
                )}
                Restore
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Footer */}
      <PaginationBar
        page={page}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={filtered.length}
        pageSizeOptions={[10, 25, 50]}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}
