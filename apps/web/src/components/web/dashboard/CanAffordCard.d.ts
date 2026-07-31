import { CanAffordVerdictType } from "@money-matters/types";
interface CanAffordCardProps {
    canAffordAmount: string;
    setCanAffordAmount: (amt: string) => void;
    canAffordData?: CanAffordVerdictType | null;
    fmt: (val: string | number) => string;
}
export declare function CanAffordCard({ canAffordAmount, setCanAffordAmount, canAffordData, fmt, }: CanAffordCardProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=CanAffordCard.d.ts.map