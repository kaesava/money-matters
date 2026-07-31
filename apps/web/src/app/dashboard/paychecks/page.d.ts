export interface UnifiedSourceItem {
    id: string;
    type: "INCOME" | "EXPENSE";
    name: string;
    amount: string;
    rrule?: string | null;
    startDate?: string | null;
    categoryId?: string | null;
    receivingAccountId?: string | null;
    categoryName?: string;
    accountName?: string;
    isUpcoming: boolean;
}
export default function IncomeAndExpensesPage(): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=page.d.ts.map