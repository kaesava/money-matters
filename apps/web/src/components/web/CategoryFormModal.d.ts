export interface CategoryFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    categoryToEdit?: {
        id: string;
        name: string;
        type: "REGULAR" | "GOAL" | "EVERYDAY";
        monthlyAmount?: string | null;
        targetAmount?: string | null;
        targetDate?: string | null;
        bankAccountId?: string | null;
        everydayTargetKeepAmount?: string | null;
    } | null;
    onSuccess?: () => void;
}
export declare function CategoryFormModal({ isOpen, onClose, categoryToEdit, onSuccess, }: CategoryFormModalProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=CategoryFormModal.d.ts.map