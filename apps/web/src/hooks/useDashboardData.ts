"use client";
import { trpc } from "../lib/trpc";

/**
 * Shared hook for dashboard pages.
 * First checks tenant status — if no tenant exists, tenant-scoped queries are skipped
 * to avoid the UNAUTHORIZED error from tenantProcedure.
 */
export function useDashboardData() {
  const tenantStatusQuery = trpc.getTenantStatus.useQuery(undefined, {
    retry: 1,
    staleTime: 1000 * 60, // 1 min — tenant status rarely changes
  });

  const hasTenant = tenantStatusQuery.data?.hasTenant ?? false;

  const categoriesQuery = trpc.listCategories.useQuery(undefined, {
    enabled: hasTenant,
    retry: 1,
  });

  const incomeEventsQuery = trpc.listIncomeEvents.useQuery(undefined, {
    enabled: hasTenant,
    retry: 1,
  });

  const isLoadingTenant = tenantStatusQuery.isPending;
  const tenantError = tenantStatusQuery.error;

  return {
    hasTenant,
    isLoadingTenant,
    tenantError,
    categoriesQuery,
    incomeEventsQuery,
  };
}
