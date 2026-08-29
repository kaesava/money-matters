"use client";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc, buildTrpcClient } from "../lib/trpc";
import { authClient } from "../lib/auth";
import posthog from "../lib/posthog-client";
import { ToastProvider, ToastContainer, NetworkErrorBanner } from "@money-matters/ui/web";

interface NetworkStatusContextType {
  isGlobalError: boolean;
  clearGlobalError: () => void;
  lastErrorMessage: string | null;
}

const NetworkStatusContext = createContext<NetworkStatusContextType>({
  isGlobalError: false,
  clearGlobalError: () => {},
  lastErrorMessage: null,
});

export function useNetworkStatus() {
  return useContext(NetworkStatusContext);
}

function isNetworkOrServerError(error: unknown): boolean {
  const errStr = String((error as Error)?.message || error);
  return (
    errStr.includes("fetch failed") ||
    errStr.includes("ECONNREFUSED") ||
    errStr.includes("500") ||
    errStr.includes("502") ||
    errStr.includes("503") ||
    errStr.includes("504") ||
    errStr.includes("NetworkError") ||
    errStr.includes("Failed to fetch") ||
    errStr.includes("Unable to transform response") ||
    errStr.includes("Database") ||
    errStr.includes("PostgreSQL") ||
    errStr.includes("Internal Server Error")
  );
}

interface AppProvidersProps {
  children: React.ReactNode;
}

function SessionSyncTracker({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession();
  const identifiedDistinctId = useRef<string | null>(null);

  useEffect(() => {
    if (isPending) return;

    const user = session?.user as
      | { id?: unknown; email?: unknown; name?: unknown }
      | undefined;
    const distinctId = typeof user?.id === "string" && user.id.trim()
      ? user.id
      : null;

    if (!distinctId) {
      identifiedDistinctId.current = null;
      return;
    }

    if (identifiedDistinctId.current === distinctId) return;

    const identifiedUserId = posthog.get_property("$user_id");
    if (typeof identifiedUserId === "string" && identifiedUserId !== distinctId) {
      posthog.reset();
    }

    posthog.identify(distinctId, {
      ...(typeof user?.email === "string" ? { email: user.email } : {}),
      ...(typeof user?.name === "string" ? { name: user.name } : {}),
    });
    identifiedDistinctId.current = distinctId;
  }, [isPending, session]);

  return <>{children}</>;
}

export function AppProviders({ children }: AppProvidersProps) {
  const [isGlobalError, setIsGlobalError] = useState(false);
  const [lastErrorMessage, setLastErrorMessage] = useState<string | null>(null);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error) => {
            if (isNetworkOrServerError(error)) {
              setIsGlobalError(true);
              setLastErrorMessage(
                "Money Matters servers or database are currently unreachable. Retrying automatically..."
              );
            }
          },
        }),
        mutationCache: new MutationCache({
          onError: (error) => {
            if (isNetworkOrServerError(error)) {
              setIsGlobalError(true);
              setLastErrorMessage(
                "Action could not be saved because the server is currently offline or under maintenance."
              );
            }
          },
        }),
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 1000 * 30, // 30 seconds
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: 0,
          },
        },
      })
  );

  const [trpcClient] = useState(() => buildTrpcClient());

  const clearGlobalError = () => {
    setIsGlobalError(false);
    setLastErrorMessage(null);
  };

  return (
    <NetworkStatusContext.Provider value={{ isGlobalError, clearGlobalError, lastErrorMessage }}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <SessionSyncTracker>
              <NetworkErrorBanner
                isVisible={isGlobalError}
                onRetry={() => {
                  clearGlobalError();
                  queryClient.refetchQueries();
                }}
                onDismiss={clearGlobalError}
                message={lastErrorMessage}
              />
              {children}
              <ToastContainer />
            </SessionSyncTracker>
          </ToastProvider>
        </QueryClientProvider>
      </trpc.Provider>
    </NetworkStatusContext.Provider>
  );
}
