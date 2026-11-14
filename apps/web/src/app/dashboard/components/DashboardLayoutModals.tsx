"use client";

import React from "react";
import { useRouter, usePathname } from "next/navigation";
import type { QuickActionInitialData } from "@money-matters/types";
import { CommandPaletteModal } from "@money-matters/ui/web";
import { QuickExpenseDrawer } from "../../../components/web/QuickExpenseDrawer";
import { KeyboardShortcutsModal } from "./KeyboardShortcutsModal";
import { handlePennyPrefillNavigation } from "./DashboardPennyHandler";

type CommandPaletteProps = React.ComponentProps<typeof CommandPaletteModal>;

interface DashboardLayoutModalsProps {
  quickExpenseOpen: boolean;
  setQuickExpenseOpen: (open: boolean) => void;
  quickExpenseData: QuickActionInitialData | undefined;
  setQuickExpenseData: (data: QuickActionInitialData | undefined) => void;
  showShortcutsModal: boolean;
  setShowShortcutsModal: (open: boolean) => void;
  askPennyOpen: boolean;
  setAskPennyOpen: (open: boolean) => void;
  hasSimulation: boolean;
  hasAiAssistant: boolean;
  searchPages: CommandPaletteProps["pages"];
  searchAccounts: CommandPaletteProps["accounts"];
  searchEnvelopes: CommandPaletteProps["envelopes"];
  searchEvents: CommandPaletteProps["upcomingEvents"];
  handleSearchTransactions: CommandPaletteProps["onSearchTransactions"];
  remainingCalls: number | undefined;
  onAskPenny?: CommandPaletteProps["onAskPenny"];
}

/**
 * Renders global dashboard layout drawers and modals (Quick Expense, Shortcuts, and Command Palette).
 */
export function DashboardLayoutModals({
  quickExpenseOpen,
  setQuickExpenseOpen,
  quickExpenseData,
  setQuickExpenseData,
  showShortcutsModal,
  setShowShortcutsModal,
  askPennyOpen,
  setAskPennyOpen,
  hasSimulation,
  hasAiAssistant,
  searchPages,
  searchAccounts,
  searchEnvelopes,
  searchEvents,
  handleSearchTransactions,
  remainingCalls,
  onAskPenny,
}: DashboardLayoutModalsProps) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <>
      {quickExpenseOpen && (
        <QuickExpenseDrawer
          initialTab={quickExpenseData?.type || (pathname.startsWith("/dashboard/envelopes") ? "CREDIT" : "DEBIT")}
          initialData={quickExpenseData}
          onClose={() => {
            setQuickExpenseOpen(false);
            setQuickExpenseData(undefined);
          }}
        />
      )}

      <KeyboardShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />

      <CommandPaletteModal
        isOpen={askPennyOpen}
        onClose={() => setAskPennyOpen(false)}
        hasSimulation={hasSimulation}
        hasAiAssistant={hasAiAssistant}
        pages={searchPages}
        accounts={searchAccounts}
        envelopes={searchEnvelopes}
        upcomingEvents={searchEvents}
        onSearchTransactions={handleSearchTransactions}
        remainingCalls={remainingCalls}
        onAskPenny={onAskPenny}
        onNavigatePrefill={(prefill) =>
          handlePennyPrefillNavigation(prefill, router, setQuickExpenseData, setQuickExpenseOpen, hasSimulation)
        }
        onSelectPage={(page) => {
          if (page.isAction) {
            setQuickExpenseData(undefined);
            setQuickExpenseOpen(true);
            return;
          }
          router.push(page.route);
        }}
        onSelectAccount={(acc) => router.push(`/dashboard/bank-accounts?id=${encodeURIComponent(acc.id)}`)}
        onSelectEnvelope={(env) => router.push(`/dashboard/envelopes?poolId=${encodeURIComponent(env.id)}`)}
        onSelectEvent={(ev) => router.push(`/dashboard/plan?tab=events&search=${encodeURIComponent(ev.name)}`)}
        onSelectTransaction={(tx) => {
          const term = tx.note || tx.envelopeName || String(tx.amount);
          router.push(`/dashboard/history?tab=transactions&search=${encodeURIComponent(term)}`);
        }}
        onViewAllTransactions={(q) => router.push(`/dashboard/history?tab=transactions&search=${encodeURIComponent(q)}`)}
      />
    </>
  );
}
