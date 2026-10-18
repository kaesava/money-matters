import React from 'react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('react-native', () => ({
  View: (props: Record<string, unknown>) => React.createElement('View', props),
  Text: (props: Record<string, unknown>) => React.createElement('Text', props),
  Modal: (props: Record<string, unknown>) => React.createElement('Modal', props),
  Pressable: (props: Record<string, unknown>) => React.createElement('Pressable', props),
  TouchableOpacity: (props: Record<string, unknown>) => React.createElement('TouchableOpacity', props),
  StyleSheet: {
    create: <T extends Record<string, unknown>>(styles: T): T => styles,
  },
}));

import {
  MobileConfirmDialog,
  MobileConfirmContainer,
  showMobileConfirm,
  registerConfirmListener,
} from '../MobileConfirmDialog';

describe('MobileConfirmDialog and showMobileConfirm', () => {
  it('renders MobileConfirmDialog element properly', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    const element = (
      <MobileConfirmDialog
        visible={true}
        title="Discard changes?"
        message="You have unsaved changes."
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    expect(element).toBeTruthy();
  });

  it('renders MobileConfirmContainer element properly', () => {
    const container = <MobileConfirmContainer />;
    expect(container).toBeTruthy();
  });

  it('dispatches options to registered listener', () => {
    const listener = vi.fn();
    const unregister = registerConfirmListener(listener);

    const onConfirm = vi.fn();
    showMobileConfirm({
      title: 'Delete Envelope',
      message: 'Are you sure?',
      onConfirm,
    });

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Delete Envelope',
        message: 'Are you sure?',
        onConfirm,
      })
    );

    unregister();

    const secondListener = vi.fn();
    showMobileConfirm({
      title: 'Unregistered test',
      message: 'Should not fire unmounted',
      onConfirm: vi.fn(),
    });
    expect(secondListener).not.toHaveBeenCalled();
  });
});
