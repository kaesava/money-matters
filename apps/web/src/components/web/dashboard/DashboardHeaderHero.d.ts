interface DashboardHeaderHeroProps {
    nextPaydayEvent: {
        id: string;
        sourceName?: string | null;
        actualAmount?: string | null;
        expectedAmount: string;
        expectedDate: string;
    } | null;
    daysUntilPayday: number | null;
    fmt: (val: string | number) => string;
    fmtAUDate: (dStr: string) => string;
    onProcessPayday: (eventId: string) => void;
    onQuickApprovePayday?: (eventId: string, amount: string) => void;
}
export declare function DashboardHeaderHero({ nextPaydayEvent, daysUntilPayday, fmt, fmtAUDate, onProcessPayday, onQuickApprovePayday, }: DashboardHeaderHeroProps): import("react/jsx-runtime").JSX.Element | null;
export {};
//# sourceMappingURL=DashboardHeaderHero.d.ts.map