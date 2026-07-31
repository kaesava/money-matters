interface UpcomingExpenseModalProps {
    visible: boolean;
    onClose: () => void;
    eventToEdit?: {
        id?: string;
        name?: string;
        expectedDate?: string;
        expectedAmount?: string;
        categoryId?: string | null;
        categoryName?: string;
        note?: string | null;
        isRecurring?: boolean;
    } | null;
    isQuickAdd?: boolean;
    onSuccess?: () => void;
}
export declare function UpcomingExpenseModal({ visible, onClose, eventToEdit, isQuickAdd, onSuccess, }: UpcomingExpenseModalProps): import("react/jsx-runtime").JSX.Element | null;
export {};
//# sourceMappingURL=UpcomingExpenseModal.d.ts.map