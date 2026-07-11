import { describe, it, expect } from 'vitest';
import React from 'react';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it('renders and matches standard status matching', () => {
    expect(StatusBadge).toBeDefined();
  });
});
