interface CategoryItem {
    id: string;
    name: string;
    type: 'GOAL' | 'REGULAR' | 'EVERYDAY';
    targetAmount?: string | null;
    targetDate?: string | null;
    monthlyAmount?: string | null;
    everydayTargetKeepAmount?: string | null;
    bankAccountId?: string | null;
}
interface CategoryFormModalProps {
    visible: boolean;
    categoryToEdit?: CategoryItem | null;
    onClose: () => void;
    onSuccess?: () => void;
}
export declare function CategoryFormModal({ visible, categoryToEdit, onClose, onSuccess }: CategoryFormModalProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=CategoryFormModal.d.ts.map