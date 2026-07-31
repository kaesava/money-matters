import React from "react";
interface Category {
    id: string;
    name: string;
}
interface BankReconcileModalProps {
    reconcilingAccountId: string | null;
    onClose: () => void;
    reconcileActualAmount: string;
    setReconcileActualAmount: (val: string) => void;
    reconcileTargetCategoryId: string;
    setReconcileTargetCategoryId: (val: string) => void;
    categories: Category[];
    isPending: boolean;
    onSubmit: (e: React.FormEvent) => void;
}
export declare function BankReconcileModal({ reconcilingAccountId, onClose, reconcileActualAmount, setReconcileActualAmount, reconcileTargetCategoryId, setReconcileTargetCategoryId, categories, isPending, onSubmit, }: BankReconcileModalProps): import("react/jsx-runtime").JSX.Element | null;
export {};
//# sourceMappingURL=BankReconcileModal.d.ts.map