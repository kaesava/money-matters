import React from 'react';
export interface WebCollapsibleSectionProps {
    readonly title: string;
    readonly defaultOpen?: boolean;
    readonly children: React.ReactNode;
    readonly action?: React.ReactNode;
    readonly className?: string;
}
export declare const CollapsibleSection: React.FC<WebCollapsibleSectionProps>;
export default CollapsibleSection;
//# sourceMappingURL=CollapsibleSection.d.ts.map