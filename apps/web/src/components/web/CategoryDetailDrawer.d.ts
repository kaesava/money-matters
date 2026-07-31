interface CategoryDetailDrawerProps {
    categoryId: string | null;
    onClose: () => void;
    onResolveShortfall?: (categoryId: string) => void;
}
/** Slide-in panel showing category detail + transaction history. */
export declare function CategoryDetailDrawer({ categoryId, onClose }: CategoryDetailDrawerProps): import("react/jsx-runtime").JSX.Element | null;
export {};
//# sourceMappingURL=CategoryDetailDrawer.d.ts.map