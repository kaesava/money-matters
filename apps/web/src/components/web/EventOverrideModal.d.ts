interface EventOverrideModalProps {
    isOpen: boolean;
    onClose: () => void;
    eventToEdit: {
        id: string;
        eventType: "INCOME" | "EXPENSE";
        name: string;
        expectedDate: string;
        expectedAmount: string;
        paymentMethod?: string | null;
    } | null;
    onSuccess?: () => void;
}
export default function EventOverrideModal({ isOpen, onClose, eventToEdit, onSuccess, }: EventOverrideModalProps): import("react/jsx-runtime").JSX.Element | null;
export {};
//# sourceMappingURL=EventOverrideModal.d.ts.map