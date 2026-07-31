import React from 'react';
import { CanAffordVerdictType } from '@money-matters/types';
export interface DashboardHeroCardProps {
    readonly everydayBalance: number;
    readonly needsAttentionCount: number;
    readonly behindCount: number;
    readonly onTrackCount: number;
    readonly canAffordAmount: string;
    readonly setCanAffordAmount: (amt: string) => void;
    readonly canAffordData?: CanAffordVerdictType | null;
    readonly nextPayday?: {
        readonly id: string;
        readonly name: string;
        readonly amount: number;
        readonly expectedDate: string;
    } | null;
    readonly onPressNextPay: (eventId: string) => void;
    readonly onSelectFilter?: (health: string) => void;
}
export declare const DashboardHeroCard: React.FC<DashboardHeroCardProps>;
export default DashboardHeroCard;
//# sourceMappingURL=DashboardHeroCard.d.ts.map