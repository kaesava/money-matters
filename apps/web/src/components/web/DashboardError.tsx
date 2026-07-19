"use client";
import React from "react";
import { t } from "@money-matters/i18n";
import { TRPCClientError } from "@trpc/client";

interface DashboardErrorProps {
  error: unknown;
  onRetry?: () => void;
  /** Compact mode — inline within a section rather than full-height */
  compact?: boolean;
}

function getErrorMessage(error: unknown): { title: string; detail: string; isApiDown: boolean } {
  // Network / proxy failure — API server not running
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return {
      title: "Cannot reach the server",
      detail: "The API server may not be running. Start it with `pnpm dev` in the monorepo root.",
      isApiDown: true,
    };
  }

  if (error instanceof TRPCClientError) {
    const code = error.data?.code as string | undefined;

    if (code === "UNAUTHORIZED") {
      return {
        title: "Session expired",
        detail: "Your session may have expired. Please sign in again.",
        isApiDown: false,
      };
    }

    if (error.message?.includes("ECONNREFUSED") || error.message?.includes("Failed to connect")) {
      return {
        title: "Cannot reach the server",
        detail: "The API server may not be running. Start it with `pnpm dev` in the monorepo root.",
        isApiDown: true,
      };
    }

    return {
      title: t("common.error"),
      detail: error.message ?? t("common.error"),
      isApiDown: false,
    };
  }

  return {
    title: t("common.error"),
    detail: error instanceof Error ? error.message : t("common.error"),
    isApiDown: false,
  };
}

/** Contextual error display for dashboard sections — never shows a generic "Something went wrong" */
export function DashboardError({ error, onRetry, compact = false }: DashboardErrorProps) {
  const { title, detail, isApiDown } = getErrorMessage(error);

  if (compact) {
    return (
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-xl"
        style={{ backgroundColor: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}
        role="alert"
      >
        <span className="text-lg shrink-0">{isApiDown ? "🔌" : "⚠️"}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: "var(--dash-critical)" }}>{title}</p>
          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--dash-muted)" }}>{detail}</p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors hover:opacity-80"
            style={{ backgroundColor: "var(--dash-critical)", color: "white" }}
          >
            {t("common.retry")}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <span className="text-4xl">{isApiDown ? "🔌" : "⚠️"}</span>
      <div>
        <p className="text-base font-bold" style={{ color: "var(--dash-text)" }}>{title}</p>
        <p className="text-sm mt-1 max-w-sm" style={{ color: "var(--dash-muted)" }}>{detail}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 px-5 py-2 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity"
          style={{ backgroundColor: "var(--dash-teal)" }}
        >
          {t("common.retry")}
        </button>
      )}
    </div>
  );
}
