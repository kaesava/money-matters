/**
 * Entry point route — immediately redirects based on auth + setup state.
 *
 * Decision tree:
 *   not authenticated → /(auth)/sign-in
 *   authenticated, no setup → /(setup)/income
 *   authenticated, setup done → /(app)/home
 */
export default function IndexRoute(): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=index.d.ts.map