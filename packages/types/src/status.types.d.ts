/**
 * Status Workflow & Color Config Types
 *
 * Defines cross-platform status visualization schema (web Tailwind tokens vs mobile HSL/hex strings)
 * and finite state machine transition rules.
 */
/**
 * Visual styling definition for a status indicator on web and mobile platforms.
 */
export interface StatusStep {
    /** Unique code identifier for the status step (e.g. 'New', 'Active'). */
    code: string;
    /** Human-readable display label. */
    label: string;
    /** Platform-specific color design tokens. */
    color: {
        web: {
            border: string;
            bg: string;
            text: string;
        };
        mobile: {
            bg: string;
            text: string;
        };
    };
}
/**
 * Workflow configuration defining valid states, transition rules, and starting state.
 */
export interface StatusWorkflowConfig {
    /** List of configured status steps. */
    statuses: StatusStep[];
    /** Transition lookup map detailing allowed target status codes for each source status code. */
    transitions: Record<string, string[]>;
    /** Default initial status code. */
    defaultStatus: string;
}
/**
 * Standard default workflow configuration for entities with basic lifecycle states.
 */
export declare const DEFAULT_STATUS_WORKFLOW: StatusWorkflowConfig;
/**
 * Resolves platform-specific color tokens for a given status code.
 *
 * @param status - Target status code (case-insensitive)
 * @param platform - Target runtime platform ('web' or 'mobile')
 * @param config - Optional workflow configuration override
 * @returns Color tokens matching web or mobile interface specifications
 */
export declare function getStatusColor(status: string, platform: 'web', config?: StatusWorkflowConfig): StatusStep['color']['web'];
export declare function getStatusColor(status: string, platform: 'mobile', config?: StatusWorkflowConfig): StatusStep['color']['mobile'];
/**
 * Retrieves valid next transition status codes for a given current status code.
 *
 * @param status - Current status code (case-insensitive)
 * @param config - Optional workflow configuration override
 * @returns Array of permitted target status codes
 */
export declare function getNextStatuses(status: string, config?: StatusWorkflowConfig): string[];
//# sourceMappingURL=status.types.d.ts.map