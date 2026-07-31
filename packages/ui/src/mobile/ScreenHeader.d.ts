interface ScreenHeaderProps {
    title?: string;
    showBack?: boolean;
    onBackPress?: () => void;
    onNavigateHome?: () => void;
    showProfile?: boolean;
    user?: {
        name?: string | null;
        email?: string | null;
    } | null;
    getInitials: () => string;
    onOpenMenu: () => void;
    styles: any;
}
export declare function ScreenHeader({ title, showBack, onBackPress, onNavigateHome, showProfile, user, getInitials, onOpenMenu, styles, }: ScreenHeaderProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=ScreenHeader.d.ts.map