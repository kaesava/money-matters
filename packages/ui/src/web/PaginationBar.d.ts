export interface PaginationBarProps {
    page: number;
    totalPages: number;
    pageSize: number;
    totalItems: number;
    pageSizeOptions?: number[];
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
}
export declare function PaginationBar({ page, totalPages, pageSize, totalItems, pageSizeOptions, onPageChange, onPageSizeChange, }: PaginationBarProps): import("react/jsx-runtime").JSX.Element | null;
//# sourceMappingURL=PaginationBar.d.ts.map