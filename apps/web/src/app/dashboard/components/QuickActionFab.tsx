"use client";

import React from "react";
import { t } from "@money-matters/i18n";

export interface QuickActionFabProps {
  pathname: string;
  onOpenModal: () => void;
}

export function QuickActionFab({ pathname, onOpenModal }: QuickActionFabProps) {
  const isHidden = pathname.startsWith("/dashboard/income-and-bills") || pathname.startsWith("/dashboard/bank-accounts");
  if (isHidden) return null;

  const isCategoriesPage = pathname.startsWith("/dashboard/categories");

  const handleClick = () => {
    if (isCategoriesPage) {
      window.dispatchEvent(new CustomEvent("open-create-category-modal"));
    } else {
      onOpenModal();
    }
  };

  return (
    <button
      id="global-quick-add-btn"
      type="button"
      onClick={handleClick}
      style={{ backgroundColor: "var(--dash-teal)", boxShadow: "0 6px 20px rgba(0,180,166,0.3)" }}
      className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-all shadow-lg group cursor-pointer"
      title={isCategoriesPage ? "Add New Category" : "Quick Record Expense (Shortcut: n)"}
      aria-label={isCategoriesPage ? "Add Category" : t("transactions.addExpense")}
    >
      <svg className="w-5 h-5 transition-transform group-hover:rotate-90 duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
    </button>
  );
}
