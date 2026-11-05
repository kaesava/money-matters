"use client";

import React from "react";

export interface DashboardDesktopSidebarProps {
  sidebarCollapsed: boolean;
  onToggleCollapse: () => void;
  children: React.ReactNode;
}

export function DashboardDesktopSidebar({
  sidebarCollapsed,
  onToggleCollapse,
  children,
}: DashboardDesktopSidebarProps) {
  const sidebarWidthClass = sidebarCollapsed ? "w-20" : "w-64";

  return (
    <aside
      style={{ backgroundColor: "var(--dash-navy)" }}
      className={`hidden md:flex flex-col border-r border-white/10 shrink-0 sticky top-0 h-screen transition-all duration-300 z-30 ${sidebarWidthClass}`}
    >
      {children}

      {/* Sidebar Collapse Toggle Button */}
      <button
        onClick={onToggleCollapse}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-white border border-zinc-200 shadow-md flex items-center justify-center hover:bg-zinc-50 active:scale-95 transition-transform"
        aria-label="Toggle sidebar"
      >
        <svg
          className={`w-3.5 h-3.5 text-zinc-600 transition-transform duration-300 ${sidebarCollapsed ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
    </aside>
  );
}
