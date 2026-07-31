interface BankAccountItem {
    id: string;
    name: string;
    lastKnownBalance?: string | null;
    purpose?: string | null;
    isOffset?: boolean | null;
}
interface BankAccountFormModalProps {
    visible: boolean;
    accountToEdit?: BankAccountItem | null;
    onClose: () => void;
    onSuccess?: () => void;
}
export declare function BankAccountFormModal({ visible, accountToEdit, onClose, onSuccess }: BankAccountFormModalProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=BankAccountFormModal.d.ts.map