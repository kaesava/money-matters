'use client';

import React from 'react';
import { t } from '@money-matters/i18n';

// ---------------------------------------------------------------------------
// ABN formatting helper
// ---------------------------------------------------------------------------

/**
 * Formats an Australian Business Number (ABN) in the standard XX XXX XXX XXX
 * grouping pattern for display. Non-digit characters are stripped first.
 */
function formatAbn(abn: string): string {
  const digits = abn.replace(/\D/g, '');
  if (digits.length !== 11) return abn; // Return raw if not 11 digits
  return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 11)}`;
}

// ---------------------------------------------------------------------------
// EmailLink
// ---------------------------------------------------------------------------

interface EmailLinkProps {
  email: string;
  className?: string;
}

/**
 * Renders an email address as a `mailto:` anchor styled in indigo.
 * Used consistently across drawer views and table rows.
 */
export function EmailLink({ email, className = '' }: EmailLinkProps) {
  return (
    <a
      href={`mailto:${email}`}
      className={`text-indigo-600 hover:underline hover:text-indigo-800 transition-colors font-medium ${className}`}
    >
      {email}
    </a>
  );
}

// ---------------------------------------------------------------------------
// PhoneLink
// ---------------------------------------------------------------------------

interface PhoneLinkProps {
  phone: string;
  className?: string;
}

/**
 * Renders a phone number as a `tel:` anchor (strips spaces for the href).
 * Used consistently across drawer views and table rows.
 */
export function PhoneLink({ phone, className = '' }: PhoneLinkProps) {
  const dialable = phone.replace(/\s/g, '');
  return (
    <a
      href={`tel:${dialable}`}
      className={`text-indigo-600 hover:underline hover:text-indigo-800 transition-colors font-medium ${className}`}
    >
      {phone}
    </a>
  );
}

// ---------------------------------------------------------------------------
// AddressLink
// ---------------------------------------------------------------------------

interface AddressLinkProps {
  address: string;
  className?: string;
}

/**
 * Displays a formatted address string with a Google Maps deep-link beneath it.
 * Opens in a new tab with `noopener noreferrer` for security.
 */
export function AddressLink({ address, className = '' }: AddressLinkProps) {
  const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(address)}`;
  return (
    <div className={`space-y-0.5 ${className}`}>
      <p className="font-medium text-slate-800 leading-relaxed text-sm">{address}</p>
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-indigo-600 hover:underline font-semibold inline-block"
      >{t('neo.contactLinks.openInGoogleMaps')}</a>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AbnDisplay
// ---------------------------------------------------------------------------

interface AbnDisplayProps {
  abn: string;
  className?: string;
}

/**
 * Renders a formatted ABN (XX XXX XXX XXX) in a monospace font.
 * Handles both raw 11-digit strings and pre-formatted strings gracefully.
 */
export function AbnDisplay({ abn, className = '' }: AbnDisplayProps) {
  return (
    <span className={`font-mono font-semibold text-slate-700 ${className}`}>
      {formatAbn(abn)}
    </span>
  );
}
