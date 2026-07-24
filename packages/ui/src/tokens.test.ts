import { describe, it, expect } from 'vitest';
import { DESIGN_TOKENS } from './tokens.js';

describe('UI Design Tokens', () => {
  it('exposes palette colors matching specification', () => {
    expect(DESIGN_TOKENS.colors.primary).toBe('#1B2B4B');
    expect(DESIGN_TOKENS.colors.accent).toBe('#00B4A6');
    expect(DESIGN_TOKENS.colors.success).toBe('#22C55E');
    expect(DESIGN_TOKENS.colors.warning).toBe('#F59E0B');
    expect(DESIGN_TOKENS.colors.critical).toBe('#EF4444');
  });

  it('exposes border radius and spacing scale tokens', () => {
    expect(DESIGN_TOKENS.radius.default).toBe(8);
    expect(DESIGN_TOKENS.radius.full).toBe(9999);
    expect(DESIGN_TOKENS.spacing.containerMargin).toBe(20);
  });
});
