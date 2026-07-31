interface SourceToEdit {
    id: string;
    name: string;
    amount: string;
    type?: string;
    rrule?: string | null;
    startDate?: string | Date;
    categoryId?: string | null;
}
interface IncomeExpenseFormModalProps {
    visible: boolean;
    mode: 'INCOME' | 'EXPENSE';
    sourceToEdit?: SourceToEdit | null;
    onClose: () => void;
    onSuccess?: () => void;
}
export declare function IncomeExpenseFormModal({ visible, mode, sourceToEdit, onClose, onSuccess }: IncomeExpenseFormModalProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=IncomeExpenseFormModal.d.ts.map