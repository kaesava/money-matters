import React from 'react';
interface SlideOverDrawerProps {
    title: string;
    subtitle?: string;
    onClose: () => void;
    onBack?: () => void;
    children: React.ReactNode;
    headerActions?: React.ReactNode;
    widthClass?: string;
}
/**
 * A slide-over drawer component for web applications.
 * Typically used for "vertical slice" detail views or create/edit forms.
 *
 * @param props - Component props including title, onClose, and children.
 */
export declare function SlideOverDrawer({ title, subtitle, onClose, onBack, children, headerActions, widthClass, }: SlideOverDrawerProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=SlideOverDrawer.d.ts.map