export interface UpcomingExpenseItem {
    id?: string;
    name: string;
    expectedDate: string;
    expectedAmount: string;
    categoryId: string | null;
    categoryName?: string;
    note?: string | null;
    isRecurring?: boolean;
}
interface UpcomingExpenseModalProps {
    isOpen: boolean;
    onClose: () => void;
    eventToEdit?: UpcomingExpenseItem | null;
    isQuickAdd?: boolean;
    onSuccess?: () => void;
}
export default function UpcomingExpenseModal({ isOpen, onClose, eventToEdit, isQuickAdd, onSuccess, }: UpcomingExpenseModalProps): import("react/jsx-runtime").JSX.Element | null;
export {};
//# sourceMappingURL=UpcomingExpenseModal.d.ts.map