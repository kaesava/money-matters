export interface EventToOverride {
    id: string;
    eventType: 'INCOME' | 'EXPENSE';
    name: string;
    expectedDate: string;
    expectedAmount: string;
}
interface EventOverrideModalProps {
    visible: boolean;
    eventToEdit: EventToOverride | null;
    onClose: () => void;
    onSuccess?: () => void;
}
export declare function EventOverrideModal({ visible, eventToEdit, onClose, onSuccess }: EventOverrideModalProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=EventOverrideModal.d.ts.map