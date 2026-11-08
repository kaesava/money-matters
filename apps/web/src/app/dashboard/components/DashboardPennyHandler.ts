import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import type { AssistantResult, QuickActionInitialData } from "@money-matters/types";

export function handlePennyPrefillNavigation(
  prefill: Extract<AssistantResult, { type: "prefill" }>,
  router: AppRouterInstance,
  setQuickExpenseData: (data: QuickActionInitialData | undefined) => void,
  setQuickExpenseOpen: (open: boolean) => void,
  hasSimulation = true
): void {
  if (prefill.target === "add-transaction" || prefill.target === "mark-paid") {
    const amountStr = prefill.params?.amount ? String(prefill.params.amount) : "";
    const billOrMerchant = String(prefill.params?.billName || prefill.params?.merchant || prefill.params?.entityName || "");
    setQuickExpenseData({
      type: "DEBIT",
      name: billOrMerchant,
      amount: amountStr,
      date: prefill.params?.date ? String(prefill.params.date) : undefined,
      envelopeName: billOrMerchant,
    });
    setQuickExpenseOpen(true);
  } else if (prefill.target === "transfer") {
    const amountStr = prefill.params?.amount ? String(prefill.params.amount) : "";
    setQuickExpenseData({
      type: "TRANSFER",
      amount: amountStr,
      sourcePoolName: prefill.params?.sourceAccount ? String(prefill.params.sourceAccount) : undefined,
      destinationPoolName: prefill.params?.destinationAccount ? String(prefill.params.destinationAccount) : undefined,
    });
    setQuickExpenseOpen(true);
  } else if (prefill.target === "afford-check") {
    if (hasSimulation) {
      const amountParam = prefill.params?.amount ? `?amount=${prefill.params.amount}` : "";
      router.push(`/dashboard/afford-check${amountParam}`);
    }
  } else if (prefill.target === "create-bill" || prefill.target === "create-income") {
    router.push("/dashboard/income-and-bills");
  } else if (prefill.target === "history-filter") {
    router.push("/dashboard/history");
  } else if (prefill.target === "navigate") {
    const screen = String(prefill.params?.screen || "dashboard");
    router.push(`/dashboard/${screen}`);
  }
}
