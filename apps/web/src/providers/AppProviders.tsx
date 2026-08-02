"use client";
import React, { useEffect, useRef, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc, buildTrpcClient } from "../lib/trpc";
import { authClient } from "../lib/auth";
import posthog from "../lib/posthog-client";

interface AppProvidersProps {
  children: React.ReactNode;
}

function SessionSyncTracker({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession();
  const identifiedDistinctId = useRef<string | null>(null);

  useEffect(() => {
    const sessionToken = (session?.session as { token?: string })?.token;
    if (sessionToken) {
      console.log("[DEBUG client] Syncing active Better Auth JWT to localStorage...");
      localStorage.setItem("session_token", sessionToken);
    }
  }, [session]);

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
