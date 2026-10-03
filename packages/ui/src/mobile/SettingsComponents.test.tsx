import React from 'react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('react-native', () => ({
  View: (props: Record<string, unknown>) => React.createElement('View', props),
  Text: (props: Record<string, unknown>) => React.createElement('Text', props),
  Switch: (props: Record<string, unknown>) => React.createElement('Switch', props),
  Modal: (props: Record<string, unknown>) => React.createElement('Modal', props),
  TouchableOpacity: (props: Record<string, unknown>) => React.createElement('TouchableOpacity', props),
  Pressable: (props: Record<string, unknown>) => React.createElement('Pressable', props),
  TextInput: (props: Record<string, unknown>) => React.createElement('TextInput', props),
  Platform: { OS: 'android' },
  StyleSheet: {
    create: <T extends Record<string, unknown>>(styles: T): T => styles,
    hairlineWidth: 1,
  },
}));

vi.mock('@expo/vector-icons', () => ({
  Feather: () => null,
  Ionicons: () => null,
  AntDesign: () => null,
}));

import { SettingsCard } from './SettingsCard';
import { ReadOnlyField } from './ReadOnlyField';
import { SwitchRow } from './SwitchRow';
import { TypedConfirmDialog } from './TypedConfirmDialog';

describe('Mobile Settings UI Components', () => {
  it('renders SettingsCard with title and children', () => {
    const el = (
      <SettingsCard title="My Settings">
        <ReadOnlyField label="Test" value="123" />
      </SettingsCard>
    );
    expect(el).toBeTruthy();
    expect(el.props.title).toBe('My Settings');
  });

  it('renders ReadOnlyField with custom value and placeholder fallback', () => {
    const field1 = <ReadOnlyField label="Email" value="test@example.com" />;
    expect(field1.props.label).toBe('Email');
    expect(field1.props.value).toBe('test@example.com');

    const field2 = <ReadOnlyField label="Empty" value="" placeholder="N/A" />;
    expect(field2.props.placeholder).toBe('N/A');
  });

  it('renders SwitchRow with label and value', () => {
    const onValChange = vi.fn();
    const row = (
      <SwitchRow
        label="Biometrics"
        hint="Enable biometric lock"
        value={true}
        onValueChange={onValChange}
      />
    );
    expect(row.props.label).toBe('Biometrics');
    expect(row.props.value).toBe(true);
  });

  it('renders TypedConfirmDialog with confirmPhrase and buttons', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    const dialog = (
      <TypedConfirmDialog
        visible={true}
        title="Leave Household"
        confirmPhrase="LEAVE HOUSEHOLD"
        confirmLabel="Type LEAVE to confirm"
        confirmButtonText="Confirm & Leave"
        onClose={onClose}
        onConfirm={onConfirm}
      />
    );
    expect(dialog.props.confirmPhrase).toBe('LEAVE HOUSEHOLD');
    expect(dialog.props.visible).toBe(true);
  });
});
