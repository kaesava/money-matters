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
export const DEFAULT_STATUS_WORKFLOW: StatusWorkflowConfig = {
  defaultStatus: 'New',
  statuses: [
    {
      code: 'New',
      label: 'New',
      color: {
        web: { border: 'border-t-slate-400', bg: 'bg-slate-50/50 text-slate-700', text: 'text-slate-700' },
        mobile: { bg: '#f1f5f9', text: '#475569' }
      }
    },
    {
      code: 'Active',
      label: 'Active',
      color: {
        web: { border: 'border-t-emerald-500', bg: 'bg-emerald-50 text-emerald-700', text: 'text-emerald-700' },
        mobile: { bg: '#dcfce7', text: '#15803d' }
      }
    },
    {
      code: 'Pending',
      label: 'Pending',
      color: {
        web: { border: 'border-t-amber-500', bg: 'bg-amber-50 text-amber-700', text: 'text-amber-700' },
        mobile: { bg: '#fef9c3', text: '#a16207' }
      }
    },
    {
      code: 'Archived',
      label: 'Archived',
      color: {
        web: { border: 'border-t-slate-400', bg: 'bg-slate-100 text-slate-500', text: 'text-slate-500' },
        mobile: { bg: '#e2e8f0', text: '#64748b' }
      }
    }
  ],
  transitions: {
    New: ['Active', 'Archived'],
    Active: ['Pending', 'Archived'],
    Pending: ['Active', 'Archived'],
    Archived: ['Active']
  }
};

/**
 * Resolves platform-specific color tokens for a given status code.
 *
 * @param status - Target status code (case-insensitive)
 * @param platform - Target runtime platform ('web' or 'mobile')
 * @param config - Optional workflow configuration override
 * @returns Color tokens matching web or mobile interface specifications
 */
export function getStatusColor(
  status: string,
  platform: 'web',
  config?: StatusWorkflowConfig
): StatusStep['color']['web'];

export function getStatusColor(
  status: string,
  platform: 'mobile',
  config?: StatusWorkflowConfig
): StatusStep['color']['mobile'];

export function getStatusColor(
  status: string,
  platform: 'web' | 'mobile',
  config: StatusWorkflowConfig = DEFAULT_STATUS_WORKFLOW
): StatusStep['color']['web'] | StatusStep['color']['mobile'] {
  const step = config.statuses.find((s) => s.code.toLowerCase() === status.toLowerCase());
  const fallback = config.statuses[0];
  if (platform === 'web') {
    return step ? step.color.web : fallback.color.web;
  }
  return step ? step.color.mobile : fallback.color.mobile;
}

/**
 * Retrieves valid next transition status codes for a given current status code.
 *
 * @param status - Current status code (case-insensitive)
 * @param config - Optional workflow configuration override
 * @returns Array of permitted target status codes
 */
export function getNextStatuses(
  status: string,
  config: StatusWorkflowConfig = DEFAULT_STATUS_WORKFLOW
): string[] {
  const matchedKey = Object.keys(config.transitions).find(
    (k) => k.toLowerCase() === status.toLowerCase()
  );
  if (!matchedKey) return [];
  return config.transitions[matchedKey] || [];
}

