"use client";

import React from "react";

export interface DashboardMobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function DashboardMobileDrawer({
  isOpen,
  onClose,
  children,
}: DashboardMobileDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="md:hidden fixed inset-0 z-50 flex">
      {/* Backdrop mask shadow */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
      />
      {/* Menu Panel drawer */}
      <div
        style={{ backgroundColor: "var(--dash-navy)" }}
        className="relative w-72 max-w-[85vw] h-full flex flex-col z-10 shadow-2xl transition-transform animate-slide-in"
      >
        {children}
      </div>
    </div>
  );
}
