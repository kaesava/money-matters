import { describe, it, expect } from 'vitest';
import { isValidRedirectUrl } from './worker.js';

describe('API Worker Security - isValidRedirectUrl', () => {
  it('allows mobile application deep link scheme moneymatters://', () => {
    expect(isValidRedirectUrl('moneymatters://reset-password')).toBe(true);
    expect(isValidRedirectUrl('moneymatters://auth/callback')).toBe(true);
  });

  it('allows valid kaesava.au domains and subdomains', () => {
    expect(isValidRedirectUrl('https://kaesava.au/reset-password')).toBe(true);
    expect(isValidRedirectUrl('https://moneymatters.kaesava.au/reset-password')).toBe(true);
    expect(isValidRedirectUrl('https://api.moneymatters.kaesava.au')).toBe(true);
  });

  it('allows localhost and 127.0.0.1 for development', () => {
    expect(isValidRedirectUrl('http://localhost:3000/reset-password')).toBe(true);
    expect(isValidRedirectUrl('http://127.0.0.1:8787')).toBe(true);
  });

  it('blocks open redirect attempts to unwhitelisted external domains', () => {
    expect(isValidRedirectUrl('https://evil.com/reset-password')).toBe(false);
    expect(isValidRedirectUrl('https://phishing-kaesava.au.evil.com')).toBe(false);
    expect(isValidRedirectUrl('javascript:alert(1)')).toBe(false);
    expect(isValidRedirectUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    expect(isValidRedirectUrl('')).toBe(false);
  });
});
