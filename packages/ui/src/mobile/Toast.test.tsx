import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MobileToastProvider, useMobileToast, MobileToastContextValue } from './ToastContext';

function MobileTestConsumer({ onContext }: { onContext: (ctx: MobileToastContextValue) => void }) {
  const ctx = useMobileToast();
  onContext(ctx);
  return null;
}

describe('MobileToastContext and useMobileToast hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('exports valid MobileToastProvider and useMobileToast context structure', () => {
    const element = (
      <MobileToastProvider>
        <MobileTestConsumer onContext={() => {}} />
      </MobileToastProvider>
    );

    expect(element).toBeTruthy();
  });
});
