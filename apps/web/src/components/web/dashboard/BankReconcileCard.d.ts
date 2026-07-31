interface BankAccount {
    id: string;
    name: string;
    lastKnownBalance: string;
    expectedBalance?: string;
}
interface BankReconcileCardProps {
    accounts: BankAccount[];
    fmt: (val: string | number) => string;
    onOpenSettings: () => void;
    onReconcile: (id: string, balance: string) => void;
}
export declare function BankReconcileCard({ accounts, fmt, onOpenSettings, onReconcile, }: BankReconcileCardProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=BankReconcileCard.d.ts.map