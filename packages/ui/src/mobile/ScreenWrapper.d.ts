import React from "react";
export interface ScreenWrapperProps {
    title?: string;
    user?: {
        name?: string | null;
        email?: string | null;
    } | null;
    showProfile?: boolean;
    showBack?: boolean;
    onBackPress?: () => void;
    onSignOut?: () => void;
    onNavigateHome?: () => void;
    onNavigateCategories?: () => void;
    onNavigateSettings?: () => void;
    children: React.ReactNode;
    scrollable?: boolean;
}
export declare const ScreenWrapper: React.FC<ScreenWrapperProps>;
export default ScreenWrapper;
//# sourceMappingURL=ScreenWrapper.d.ts.map