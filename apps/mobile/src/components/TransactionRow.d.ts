interface TransactionRowProps {
    amount: string;
    flowType: 'DEBIT' | 'CREDIT';
    categoryName: string;
    note: string | null;
    recordedAt: string | Date;
}
export declare function TransactionRow({ amount, flowType, categoryName, note, recordedAt }: TransactionRowProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=TransactionRow.d.ts.map