import React from 'react';
export interface MobileModalDialogProps {
    visible: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    children: React.ReactNode;
}
export default function MobileModalDialog({ visible, onClose, title, subtitle, children, }: MobileModalDialogProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=MobileModalDialog.d.ts.map