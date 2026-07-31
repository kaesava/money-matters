import React from 'react';
export interface DrawerField {
    label: string;
    value: React.ReactNode;
    isImportant?: boolean;
}
export interface DrawerAction {
    label: string;
    icon?: React.ComponentType<any>;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
}
export interface GenericDetailDrawerProps {
    title: string;
    subtitle?: string;
    onClose: () => void;
    onBack?: () => void;
    fields: DrawerField[];
    children?: React.ReactNode;
    actions?: DrawerAction[];
    widthClass?: string;
}
export declare function GenericDetailDrawer({ title, subtitle, onClose, onBack, fields, children, actions, widthClass, }: GenericDetailDrawerProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=GenericDetailDrawer.d.ts.map