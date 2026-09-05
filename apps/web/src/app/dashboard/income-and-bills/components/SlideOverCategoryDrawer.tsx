"use client";

import React, { useEffect } from "react";
import { t } from "@money-matters/i18n";

export interface CategoryScheduledEvent {
  id: string;
  name: string;
  amount: string;
  dueDate: string;
  isPaid?: boolean;
  isSkipped?: boolean;
}

interface SlideOverCategoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  categoryName: string;
  events: CategoryScheduledEvent[];
  onMarkPaid?: (eventId: string, amount: string, date: string) => void;
  _onSkip?: (eventId: string) => void;
}

export function SlideOverCategoryDrawer({
  isOpen,
  onClose,
  categoryName,
  events,
  onMarkPaid,
  _onSkip,
}: SlideOverCategoryDrawerProps) {
  // ESC key dismissal (AGENTS.md Rule 13)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white dark:bg-zinc-900 shadow-2xl flex flex-col border-l border-zinc-200 dark:border-zinc-800 animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-[#1B2B4B] dark:text-white tracking-tight">
                {categoryName}
              </h2>
              <p className="text-xs text-zinc-500 font-medium mt-0.5">
                {t("incomeBillsTabs.drawerTitle")}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Events List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {events.length === 0 ? (
              <div className="text-center py-12 text-zinc-400 text-sm font-medium">
                No scheduled expense events found for this category.
              </div>
            ) : (
              events.map((evt) => (
                <div
                  key={evt.id}
                  className="p-4 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60 rounded-xl flex items-center justify-between"
                >
                  <div>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      {evt.name}
                    </h4>
                    <p className="text-xs text-zinc-500 font-mono mt-0.5">
                      Due: {evt.dueDate}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black font-mono text-[#1B2B4B] dark:text-white">
                      ${parseFloat(evt.amount || "0").toFixed(2)}
                    </div>
                    {evt.isPaid ? (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md inline-block mt-1">
                        CONFIRMED
                      </span>
                    ) : (
                      onMarkPaid && (
                        <button
                          onClick={() => onMarkPaid(evt.id, evt.amount, evt.dueDate)}
                          className="mt-1 px-2.5 py-1 bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 text-[#2563eb] text-xs font-bold rounded-lg transition-colors"
                        >
                          Mark Paid
                        </button>
                      )
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
