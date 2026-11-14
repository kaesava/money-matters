import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import type { AssistantResult, QuickActionInitialData } from "@money-matters/types";

const WEB_SCREEN_ROUTES: Record<string, string> = {
  home: "/dashboard",
  dashboard: "/dashboard",
  plan: "/dashboard/plan",
  envelopes: "/dashboard/envelopes",
  history: "/dashboard/history",
  "bank-accounts": "/dashboard/bank-accounts",
  "afford-check": "/dashboard/afford-check",
  reports: "/dashboard/reports",
  settings: "/dashboard/settings",
  projection: "/dashboard/projection",
};

function appendPrefillParams(basePath: string, params: Record<string, string | number | boolean>): string {
  const qs = new URLSearchParams();
  if (params.name) qs.set("name", String(params.name));
  if (params.amount && Number(params.amount) > 0) qs.set("amount", String(params.amount));
  if (params.date) qs.set("date", String(params.date));
  const sep = basePath.includes("?") ? "&" : "?";
  return qs.toString() ? `${basePath}${sep}${qs.toString()}` : basePath;
}

export function handlePennyPrefillNavigation(
  prefill: Extract<AssistantResult, { type: "prefill" }>,
  router: AppRouterInstance,
  setQuickExpenseData: (data: QuickActionInitialData | undefined) => void,
  setQuickExpenseOpen: (open: boolean) => void,
  hasSimulation = true
): void {
  const p = prefill.params ?? {};
  if (prefill.target === "add-transaction" || prefill.target === "mark-paid") {
    const amountStr = p.amount ? String(p.amount) : "";
    const billOrMerchant = String(p.billName || p.merchant || p.entityName || "");
    setQuickExpenseData({
      type: "DEBIT",
      name: billOrMerchant,
      amount: amountStr,
      date: p.date ? String(p.date) : undefined,
      envelopeName: billOrMerchant,
    });
    setQuickExpenseOpen(true);
  } else if (prefill.target === "transfer") {
    setQuickExpenseData({
      type: "TRANSFER",
      amount: p.amount ? String(p.amount) : "",
      sourcePoolName: p.sourceAccount ? String(p.sourceAccount) : undefined,
      destinationPoolName: p.destinationAccount ? String(p.destinationAccount) : undefined,
    });
    setQuickExpenseOpen(true);
  } else if (prefill.target === "afford-check" && hasSimulation) {
    const amountParam = p.amount ? `?amount=${encodeURIComponent(String(p.amount))}` : "";
    router.push(`/dashboard/afford-check${amountParam}`);
  } else if (prefill.target === "create-envelope") {
    router.push(appendPrefillParams("/dashboard/envelopes?create=1", p));
  } else if (prefill.target === "edit-envelope" && p.id) {
    router.push(`/dashboard/envelopes?editId=${encodeURIComponent(String(p.id))}`);
  } else if (prefill.target === "create-bill") {
    router.push(appendPrefillParams("/dashboard/plan?tab=streams&createBill=1", p));
  } else if (prefill.target === "edit-bill" && p.id) {
    router.push(`/dashboard/plan?tab=streams&editBillId=${encodeURIComponent(String(p.id))}`);
  } else if (prefill.target === "create-income") {
    router.push(appendPrefillParams("/dashboard/plan?tab=streams&createIncome=1", p));
  } else if (prefill.target === "edit-income" && p.id) {
    router.push(`/dashboard/plan?tab=streams&editIncomeId=${encodeURIComponent(String(p.id))}`);
  } else if (prefill.target === "history-filter") {
    const qs = new URLSearchParams();
    if (p.envelopeId) qs.set("poolId", String(p.envelopeId));
    if (p.category) qs.set("search", String(p.category));
    const qStr = qs.toString();
    router.push(qStr ? `/dashboard/history?${qStr}` : "/dashboard/history");
  } else if (prefill.target === "navigate") {
    const screen = String(p.screen || "home");
    if (screen === "afford-check" && !hasSimulation) return;
    router.push(WEB_SCREEN_ROUTES[screen] ?? "/dashboard");
  }
}
