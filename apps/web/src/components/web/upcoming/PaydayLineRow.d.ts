interface PaydayLineRowProps {
    bucketId: string;
    bucketName: string;
    reasoning: string;
    amountVal: string;
    onAmountChange: (val: string) => void;
    onShowReasoning: (name: string, reason: string) => void;
    categoryBalance?: number;
    healthStatus?: "GREEN" | "AMBER" | "RED" | null;
    isFutureDate: boolean;
}
export declare function PaydayLineRow({ bucketId: _bucketId, bucketName, reasoning, amountVal, onAmountChange, onShowReasoning, categoryBalance, healthStatus, isFutureDate, }: PaydayLineRowProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=PaydayLineRow.d.ts.map