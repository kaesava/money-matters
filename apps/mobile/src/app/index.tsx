import { Redirect } from 'expo-router';
import { isAuthenticated, hasCompletedSetup } from '../lib/mock-session';

/**
 * Entry point route — immediately redirects based on auth + setup state.
 *
 * Decision tree:
 *   not authenticated → /(auth)/sign-in
 *   authenticated, no setup → /(setup)/income
 *   authenticated, setup done → /(app)/home
 *
 * Phase 5: isAuthenticated() will check the real JWT, and hasCompletedSetup()
 * will be derived from a lightweight getHousehold query on app startup.
 */
export default function IndexRoute() {
  if (!isAuthenticated()) {
    return <Redirect href="/(auth)/sign-in" />;
  }
  if (!hasCompletedSetup()) {
    return <Redirect href="/(setup)/income" />;
  }
  return <Redirect href="/(app)/home" />;
}
