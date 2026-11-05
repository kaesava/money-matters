"use client";

import React, { useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { trpc } from "../../../lib/trpc";
import { t } from "@money-matters/i18n";
import { InfoTooltip, Tabs, Spinner } from "@money-matters/ui/web";
import { TransactionsTab } from "./components/TransactionsTab";
import { PaydayAllocationsTab } from "./components/PaydayAllocationsTab";

function TransactionsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "transactions";
  const poolIdParam = searchParams.get("poolId") || searchParams.get("id") || "";
  const categoryIdParam = searchParams.get("categoryId") || "";
  const bankAccountIdParam = searchParams.get("bankAccountId") || "";
  const initialSearch = searchParams.get("search") || "";
  const [activeTab, setActiveTab] = useState(initialTab);

  const poolsQuery = trpc.listPools.useQuery();
  const bankAccountsQuery = trpc.getBankAccountsWithMappings.useQuery();

  const pools = useMemo(() => poolsQuery.data ?? [], [poolsQuery.data]);
  const bankAccounts = useMemo(() => bankAccountsQuery.data ?? [], [bankAccountsQuery.data]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    router.replace(`/dashboard/history?tab=${tabId}`, { scroll: false });
  };

  const tabsList = [
    { id: "transactions", label: t("transactions.tabs.transactions") },
    { id: "payday-allocations", label: t("transactions.tabs.paydayAllocations") },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-6xl pb-16 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-extrabold text-[#1B2B4B]">
            {t("transactions.title")}
          </h1>
          <InfoTooltip
            title={t("tooltips.transactions.title")}
            content={t("tooltips.transactions.content")}
          />
        </div>
      </div>

      {/* 2-Tab Navigation Bar */}
      <Tabs tabs={tabsList} activeTab={activeTab} onChange={handleTabChange} />

      {/* Tab 1: Itemized Transactions Ledger */}
      {activeTab === "transactions" && (
        <TransactionsTab
          pools={pools}
          bankAccounts={bankAccounts}
          poolIdParam={poolIdParam}
          categoryIdParam={categoryIdParam}
          bankAccountIdParam={bankAccountIdParam}
          initialSearch={initialSearch}
          isActive={activeTab === "transactions"}
        />
      )}

      {/* Tab 2: Payday Waterfall Allocation History */}
      {activeTab === "payday-allocations" && (
        <PaydayAllocationsTab
          bankAccounts={bankAccounts}
          bankAccountIdParam={bankAccountIdParam}
          isActive={activeTab === "payday-allocations"}
        />
      )}
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      }
    >
      <TransactionsPageContent />
    </Suspense>
  );
}
