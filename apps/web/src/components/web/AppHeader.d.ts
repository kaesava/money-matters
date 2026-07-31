interface User {
    name?: string | null;
    email?: string | null;
}
interface AppHeaderProps {
    user: User | null | undefined;
    onQuickExpense: () => void;
    onSignOut: () => void;
}
/** Sticky top header for the authenticated dashboard. Navy/Teal design tokens. */
export declare function AppHeader({ user, onQuickExpense, onSignOut }: AppHeaderProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=AppHeader.d.ts.map