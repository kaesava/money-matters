interface EmailLinkProps {
    email: string;
    className?: string;
}
/**
 * Renders an email address as a `mailto:` anchor styled in indigo.
 * Used consistently across drawer views and table rows.
 */
export declare function EmailLink({ email, className }: EmailLinkProps): import("react/jsx-runtime").JSX.Element;
interface PhoneLinkProps {
    phone: string;
    className?: string;
}
/**
 * Renders a phone number as a `tel:` anchor (strips spaces for the href).
 * Used consistently across drawer views and table rows.
 */
export declare function PhoneLink({ phone, className }: PhoneLinkProps): import("react/jsx-runtime").JSX.Element;
interface AddressLinkProps {
    address: string;
    className?: string;
}
/**
 * Displays a formatted address string with a Google Maps deep-link beneath it.
 * Opens in a new tab with `noopener noreferrer` for security.
 */
export declare function AddressLink({ address, className }: AddressLinkProps): import("react/jsx-runtime").JSX.Element;
interface AbnDisplayProps {
    abn: string;
    className?: string;
}
/**
 * Renders a formatted ABN (XX XXX XXX XXX) in a monospace font.
 * Handles both raw 11-digit strings and pre-formatted strings gracefully.
 */
export declare function AbnDisplay({ abn, className }: AbnDisplayProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=ContactLinks.d.ts.map