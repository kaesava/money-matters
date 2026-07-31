import React from 'react';
interface AppProvidersProps {
    children: React.ReactNode;
}
/**
 * Root provider tree for the mobile app.
 * Wraps all screens with tRPC + React Query contexts.
 *
 * Architecture note: queryClient and trpcClient are created once via useState
 * so they are stable across renders without requiring a global singleton or
 * module-level side-effect. This pattern is safe with React 19's strict mode.
 */
export declare function AppProviders({ children }: AppProvidersProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=AppProviders.d.ts.map