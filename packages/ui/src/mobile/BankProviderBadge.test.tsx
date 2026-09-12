import React from 'react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('react-native', () => ({
  View: (props: Record<string, unknown>) => React.createElement('View', props),
  Text: (props: Record<string, unknown>) => React.createElement('Text', props),
  StyleSheet: {
    create: <T extends Record<string, unknown>>(styles: T): T => styles,
  },
}));

import { BankProviderBadge } from './BankProviderBadge';

describe('BankProviderBadge', () => {
  it('renders correctly with default provider', () => {
    const el = <BankProviderBadge />;
    expect(el).toBeTruthy();
    expect(el.props.provider).toBeUndefined();
  });

  it('renders correctly with specific bank providers', () => {
    const cba = <BankProviderBadge provider="CBA" size="sm" />;
    expect(cba.props.provider).toBe('CBA');

    const anz = <BankProviderBadge provider="ANZ" size="md" />;
    expect(anz.props.provider).toBe('ANZ');

    const westpac = <BankProviderBadge provider="Westpac" />;
    expect(westpac.props.provider).toBe('Westpac');

    const nab = <BankProviderBadge provider="NAB" />;
    expect(nab.props.provider).toBe('NAB');

    const ing = <BankProviderBadge provider="ING" />;
    expect(ing.props.provider).toBe('ING');

    const macquarie = <BankProviderBadge provider="Macquarie" />;
    expect(macquarie.props.provider).toBe('Macquarie');
  });
});

