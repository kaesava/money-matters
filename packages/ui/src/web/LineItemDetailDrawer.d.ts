export interface LineItem {
    id?: string;
    name?: string;
    description?: string;
    quantity: number;
    unitPriceCents: number;
    gstRate?: number;
    gstAmountCents?: number;
    totalAmountCents?: number;
}
interface LineItemDetailDrawerProps {
    lineItem: LineItem | null;
    onClose: () => void;
    onBack: () => void;
}
export declare function LineItemDetailDrawer({ lineItem, onClose, onBack, }: LineItemDetailDrawerProps): import("react/jsx-runtime").JSX.Element | null;
export {};
//# sourceMappingURL=LineItemDetailDrawer.d.ts.map