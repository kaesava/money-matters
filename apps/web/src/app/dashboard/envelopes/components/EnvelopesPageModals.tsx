"use client";

import React from "react";
import { ConfirmDialog } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";
import { trpc } from "../../../../lib/trpc";
import { QuickExpenseDrawer as QuickActionDrawer } from "../../../../components/web/QuickExpenseDrawer";
import { EnvelopeFormModal } from "../../../../components/web/EnvelopeFormModal";
import { EnvelopeDetailDrawer } from "../../plan/components/EnvelopeDetailDrawer";
import type { EnvelopeSummaryItem, PoolTableRow } from "../types";

interface EnvelopesPageModalsProps {
  isQuickDrawerOpen: boolean;
  setIsQuickDrawerOpen: (open: boolean) => void;
  quickDrawerTab: "DEBIT" | "CREDIT" | "TRANSFER";
  quickDrawerInitialData?: {
    type?: "DEBIT" | "CREDIT" | "TRANSFER";
    name?: string;
    categoryId?: string;
  };
  setQuickDrawerInitialData: (data: undefined) => void;
  isPoolModalOpen: boolean;
  setIsPoolModalOpen: (open: boolean) => void;
  poolToEdit: EnvelopeSummaryItem | null;
  setPoolToEdit: (pool: EnvelopeSummaryItem | null) => void;
  selectedPoolForDrawer: PoolTableRow | null;
  setSelectedPoolForDrawer: (pool: PoolTableRow | null) => void;
  onDrawDown: (pool: { id: string; name?: string }) => void;
  poolToArchive: EnvelopeSummaryItem | null;
  setPoolToArchive: (pool: EnvelopeSummaryItem | null) => void;
  onConfirmArchive: () => void;
  isArchiving: boolean;
}

/**
 * Renders modals, drawers, and archive confirmation for the Envelopes dashboard page.
 */
export function EnvelopesPageModals({
  isQuickDrawerOpen,
  setIsQuickDrawerOpen,
  quickDrawerTab,
  quickDrawerInitialData,
  setQuickDrawerInitialData,
  isPoolModalOpen,
  setIsPoolModalOpen,
  poolToEdit,
  setPoolToEdit,
  selectedPoolForDrawer,
  setSelectedPoolForDrawer,
  onDrawDown,
  poolToArchive,
  setPoolToArchive,
  onConfirmArchive,
  isArchiving,
}: EnvelopesPageModalsProps) {
  const utils = trpc.useUtils();

  return (
    <>
      {isQuickDrawerOpen && (
        <QuickActionDrawer
          onClose={() => {
            setIsQuickDrawerOpen(false);
            setQuickDrawerInitialData(undefined);
            utils.listEnvelopes.invalidate();
          }}
          initialTab={quickDrawerTab}
          initialData={quickDrawerInitialData}
        />
      )}

      <EnvelopeFormModal
        isOpen={isPoolModalOpen}
        onClose={() => setIsPoolModalOpen(false)}
        envelopeToEdit={poolToEdit}
        onSuccess={async () => {
          if (poolToEdit?.id && selectedPoolForDrawer?.id === poolToEdit.id) {
            setSelectedPoolForDrawer(null);
          }
          await Promise.all([
            utils.listEnvelopes.refetch(),
            utils.listExpenseEvents.refetch(),
            utils.getProjectedPoolBalances.refetch(),
          ]);
        }}
      />

      <EnvelopeDetailDrawer
        isOpen={Boolean(selectedPoolForDrawer)}
        categoryName={selectedPoolForDrawer?.name || ""}
        categoryId={selectedPoolForDrawer?.id}
        onClose={() => setSelectedPoolForDrawer(null)}
        onDrawDown={onDrawDown}
        onEditPool={(pool) => {
          setPoolToEdit(pool);
          setIsPoolModalOpen(true);
        }}
      />

      <ConfirmDialog
        isOpen={Boolean(poolToArchive)}
        onClose={() => setPoolToArchive(null)}
        onConfirm={onConfirmArchive}
        title={t("categories.archiveEnvelope")}
        description={t("categories.archivePoolConfirm", { name: poolToArchive?.name || "" })}
        confirmLabel={t("categories.archiveEnvelope")}
        variant="danger"
        isLoading={isArchiving}
      />
    </>
  );
}
