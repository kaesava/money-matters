interface PaydayPreviewWizardProps {
    visible: boolean;
    incomeEventId: string | null;
    eventToEdit?: {
        id?: string;
        sourceName?: string;
        expectedDate?: string;
        expectedAmount?: string;
        receivingAccountId?: string | null;
        note?: string | null;
        isRecurring?: boolean;
    } | null;
    isQuickAdd?: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}
export declare function PaydayPreviewWizard({ visible, incomeEventId, eventToEdit, isQuickAdd, onClose, onSuccess, }: PaydayPreviewWizardProps): import("react/jsx-runtime").JSX.Element | null;
export {};
//# sourceMappingURL=PaydayPreviewWizard.d.ts.map