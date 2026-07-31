export interface UpcomingIncomeItem {
    id?: string;
    sourceName?: string;
    expectedDate?: string;
    expectedAmount?: string;
    receivingAccountId?: string | null;
    note?: string | null;
    isRecurring?: boolean;
}
interface PaydayPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    incomeEventId?: string | null;
    eventToEdit?: UpcomingIncomeItem | null;
    isQuickAdd?: boolean;
    onSuccess?: () => void;
}
export default function PaydayPreviewModal({ isOpen, onClose, incomeEventId, eventToEdit, isQuickAdd, onSuccess, }: PaydayPreviewModalProps): import("react/jsx-runtime").JSX.Element | null;
export {};
//# sourceMappingURL=PaydayPreviewModal.d.ts.map