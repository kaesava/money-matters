"use client";
import React, { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc, buildTrpcClient } from "../lib/trpc";
import { authClient } from "../lib/auth";

interface AppProvidersProps {
  children: React.ReactNode;
}

function SessionSyncTracker({ children }: { children: React.ReactNode }) {
  const { data: session } = authClient.useSession();

  useEffect(() => {
    const sessionToken = (session?.session as { token?: string })?.token;
    if (sessionToken) {
      console.log("[DEBUG client] Syncing active Better Auth JWT to localStorage...");
      localStorage.setItem("session_token", sessionToken);
    }
  }, [session]);

  return <>{children}</>;
}

export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
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

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <SessionSyncTracker>
          {children}
        </SessionSyncTracker>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
