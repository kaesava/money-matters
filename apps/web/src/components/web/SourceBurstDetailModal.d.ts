export interface SourceBurstDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    mode: "INCOME" | "EXPENSE";
    sourceId: string | null;
    sourceName?: string;
    sourceAmount?: string;
    categoryName?: string;
}
export declare function SourceBurstDetailModal({ isOpen, onClose, mode, sourceId, sourceName, sourceAmount, categoryName, }: SourceBurstDetailModalProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=SourceBurstDetailModal.d.ts.map