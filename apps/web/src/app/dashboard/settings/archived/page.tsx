"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "../../../../lib/trpc";

export default function ArchivedItemsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "CATEGORY" | "INCOME_SOURCE" | "BANK_ACCOUNT">("ALL");

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

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {/* Header with back button */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/dashboard/settings")}
          className="p-1.5 rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-100 transition-colors"
          aria-label="Back to Settings"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-[#1B2B4B]">Archived Items</h1>
          <p className="text-xs text-zinc-500">Restore archived categories, income sources, or bank accounts.</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search archived items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-zinc-200 bg-white text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[--dash-teal]"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl">
          {(["ALL", "CATEGORY", "INCOME_SOURCE", "BANK_ACCOUNT"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                filterType === type
                  ? "bg-white text-[#1B2B4B] shadow-sm"
                  : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              {type === "ALL" ? "All" : type === "CATEGORY" ? "Categories" : type === "INCOME_SOURCE" ? "Income" : "Accounts"}
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
        <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-2xl border border-zinc-100 shadow-sm gap-2">
          <span className="text-3xl">📦</span>
          <p className="text-sm font-semibold text-zinc-700">No archived items found</p>
          <p className="text-xs text-zinc-400">Items you soft-delete will appear here for restoration.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((item) => (
            <div
              key={`${item.itemType}-${item.id}`}
              className="flex items-center justify-between p-4 rounded-xl bg-white border border-zinc-100 shadow-sm"
            >
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[#1B2B4B]">{item.name}</span>
                  <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded bg-zinc-100 text-zinc-600">
                    {item.itemType.replace("_", " ")}
                  </span>
                </div>
                {item.subtitle && (
                  <span className="text-xs text-zinc-400 font-medium">{item.subtitle}</span>
                )}
              </div>

              <button
                onClick={() =>
                  restoreMutation.mutate({
                    itemId: item.id,
                    itemType: item.itemType as "CATEGORY" | "INCOME_SOURCE" | "BANK_ACCOUNT",
                  })
                }
                disabled={restoreMutation.isPending}
                className="px-3 py-1.5 rounded-lg border border-[--dash-teal] text-[--dash-teal] text-xs font-bold hover:bg-[#00B4A6]/10 active:scale-95 transition-all"
              >
                Restore
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
