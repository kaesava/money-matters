import { type StatusWorkflowConfig } from '@money-matters/types';
interface StatusBadgeProps {
    status: string;
    config?: StatusWorkflowConfig;
    className?: string;
}
/**
 * Unified status badge component used consistently across all dashboard views.
 * Driven by the status workflow engine.
 */
export declare function StatusBadge({ status, config, className }: StatusBadgeProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=StatusBadge.d.ts.map