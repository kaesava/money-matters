import { describe, it, expect } from 'vitest';
import { getStatusColor, getNextStatuses, DEFAULT_STATUS_WORKFLOW } from './status.types.js';

describe('Status Workflow Utilities', () => {
  describe('getStatusColor', () => {
    it('returns correct web color tokens for known status', () => {
      const activeWeb = getStatusColor('Active', 'web');
      expect(activeWeb.border).toBe('border-t-emerald-500');
      expect(activeWeb.bg).toBe('bg-emerald-50 text-emerald-700');
      expect(activeWeb.text).toBe('text-emerald-700');
    });

    it('returns correct mobile color tokens for known status', () => {
      const pendingMobile = getStatusColor('Pending', 'mobile');
      expect(pendingMobile.bg).toBe('#fef9c3');
      expect(pendingMobile.text).toBe('#a16207');
    });

    it('is case-insensitive when matching status codes', () => {
      const activeWebCase = getStatusColor('aCtIvE', 'web');
      expect(activeWebCase.border).toBe('border-t-emerald-500');
    });

    it('falls back to default initial status color when status is unknown', () => {
      const unknownWeb = getStatusColor('UNKNOWN_STATUS', 'web');
      const fallbackWeb = DEFAULT_STATUS_WORKFLOW.statuses[0].color.web;
      expect(unknownWeb).toEqual(fallbackWeb);

      const unknownMobile = getStatusColor('UNKNOWN_STATUS', 'mobile');
      const fallbackMobile = DEFAULT_STATUS_WORKFLOW.statuses[0].color.mobile;
      expect(unknownMobile).toEqual(fallbackMobile);
    });

    it('supports custom workflow configuration overrides', () => {
      const customWorkflow = {
        defaultStatus: 'Draft',
        statuses: [
          {
            code: 'Draft',
            label: 'Draft',
            color: {
              web: { border: 'border-blue-200', bg: 'bg-blue-50', text: 'text-blue-600' },
              mobile: { bg: '#e0f2fe', text: '#0284c7' }
            }
          }
        ],
        transitions: { Draft: [] }
      };

      const customWeb = getStatusColor('Draft', 'web', customWorkflow);
      expect(customWeb.bg).toBe('bg-blue-50');

      const customMobile = getStatusColor('Draft', 'mobile', customWorkflow);
      expect(customMobile.bg).toBe('#e0f2fe');
    });
  });

  describe('getNextStatuses', () => {
    it('returns allowed transition targets for valid status', () => {
      const newTransitions = getNextStatuses('New');
      expect(newTransitions).toEqual(['Active', 'Archived']);

      const activeTransitions = getNextStatuses('Active');
      expect(activeTransitions).toEqual(['Pending', 'Archived']);
    });

    it('is case-insensitive when checking current status', () => {
      const pendingTransitions = getNextStatuses('pEnDiNg');
      expect(pendingTransitions).toEqual(['Active', 'Archived']);
    });

    it('returns empty array when status does not exist in transitions map', () => {
      const nonExistent = getNextStatuses('non_existent');
      expect(nonExistent).toEqual([]);
    });

    it('handles empty transition rules safely', () => {
      const customWorkflow = {
        defaultStatus: 'Final',
        statuses: [],
        transitions: { Final: [] }
      };
      expect(getNextStatuses('Final', customWorkflow)).toEqual([]);
    });
  });
});
