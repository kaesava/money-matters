import React from 'react';
export interface CollapsibleSectionProps {
    readonly title: string;
    readonly defaultOpen?: boolean;
    readonly children: React.ReactNode;
    readonly action?: React.ReactNode;
}
export declare const CollapsibleSection: React.FC<CollapsibleSectionProps>;
export default CollapsibleSection;
//# sourceMappingURL=CollapsibleSection.d.ts.map