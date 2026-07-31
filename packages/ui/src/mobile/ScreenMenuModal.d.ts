interface ScreenMenuModalProps {
    visible: boolean;
    onClose: () => void;
    user?: {
        name?: string | null;
        email?: string | null;
    } | null;
    getInitials: () => string;
    handleMenuAction: (callback?: () => void) => void;
    onNavigateHome?: () => void;
    onNavigateCategories?: () => void;
    onNavigateSettings?: () => void;
    onSignOut?: () => void;
    styles: any;
}
export declare function ScreenMenuModal({ visible, onClose, user, getInitials, handleMenuAction, onNavigateHome, onNavigateCategories, onNavigateSettings, onSignOut, styles, }: ScreenMenuModalProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=ScreenMenuModal.d.ts.map