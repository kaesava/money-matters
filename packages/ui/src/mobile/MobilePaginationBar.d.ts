export interface MobilePaginationBarProps {
    page: number;
    totalPages: number;
    pageSize: number;
    totalItems: number;
    pageSizeOptions?: number[];
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
}
export declare function MobilePaginationBar({ page, totalPages, pageSize, totalItems, pageSizeOptions, onPageChange, onPageSizeChange, }: MobilePaginationBarProps): import("react/jsx-runtime").JSX.Element | null;
//# sourceMappingURL=MobilePaginationBar.d.ts.map