interface DashboardMetricsCardsProps {
    summary: {
        totalIncome?: string;
        totalSpent?: string;
        totalSaved?: string;
        everydayRemaining?: string;
    } | undefined;
    fmt: (val: string | number) => string;
}
export declare function DashboardMetricsCards({ summary, fmt }: DashboardMetricsCardsProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=DashboardMetricsCards.d.ts.map