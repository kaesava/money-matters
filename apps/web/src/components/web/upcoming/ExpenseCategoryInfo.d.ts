interface ExpenseCategoryInfoProps {
    categoryName: string;
    currentBalance: number;
    expenseAmount: number;
    healthStatus?: "GREEN" | "AMBER" | "RED" | null;
    isFutureDate: boolean;
}
export declare function ExpenseCategoryInfo({ categoryName, currentBalance, expenseAmount, healthStatus, isFutureDate, }: ExpenseCategoryInfoProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=ExpenseCategoryInfo.d.ts.map