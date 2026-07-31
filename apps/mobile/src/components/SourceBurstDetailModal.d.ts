interface SourceBurstDetailModalProps {
    visible: boolean;
    mode: 'INCOME' | 'EXPENSE';
    sourceId: string | null;
    sourceName: string;
    sourceAmount: string;
    categoryName?: string;
    onClose: () => void;
}
export declare function SourceBurstDetailModal({ visible, mode, sourceId, sourceName, sourceAmount, categoryName, onClose, }: SourceBurstDetailModalProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=SourceBurstDetailModal.d.ts.map