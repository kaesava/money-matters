export interface IncomeExpenseFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    mode: "INCOME" | "EXPENSE";
    sourceToEdit?: {
        id: string;
        name: string;
        amount: string;
        categoryId?: string | null;
        receivingAccountId?: string | null;
        rrule?: string | null;
        startDate?: string | null;
    } | null;
    onSuccess?: () => void;
}
export declare function IncomeExpenseFormModal({ isOpen, onClose, mode, sourceToEdit, onSuccess, }: IncomeExpenseFormModalProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=IncomeExpenseFormModal.d.ts.map