import { CanAffordVerdictType } from '@money-matters/types';
export interface CanAffordCardProps {
    canAffordAmount: string;
    setCanAffordAmount: (amt: string) => void;
    canAffordData?: CanAffordVerdictType | null;
}
export declare function CanAffordCard({ canAffordAmount, setCanAffordAmount, canAffordData, }: CanAffordCardProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=CanAffordCard.d.ts.map