import React from "react";
export interface ModalDialogProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    isDirty?: boolean;
    onSave?: () => void | Promise<void>;
    children: React.ReactNode;
    maxWidthClass?: string;
}
export declare function ModalDialog({ isOpen, onClose, title, subtitle, isDirty, onSave, children, maxWidthClass, }: ModalDialogProps): import("react/jsx-runtime").JSX.Element | null;
//# sourceMappingURL=ModalDialog.d.ts.map