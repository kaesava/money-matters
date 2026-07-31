interface QuickExpenseModalProps {
    visible: boolean;
    initialType?: "DEBIT" | "CREDIT";
    onClose: () => void;
    onIncomeSuccess?: (incomeEventId: string) => void;
}
export declare function QuickExpenseModal({ visible, initialType, onClose, onIncomeSuccess }: QuickExpenseModalProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=QuickExpenseModal.d.ts.map