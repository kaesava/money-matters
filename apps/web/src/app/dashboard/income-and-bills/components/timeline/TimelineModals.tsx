import React from "react";
import { ConfirmDialog } from "@money-matters/ui/web";
import { MarkPaidModal, ShortfallTransferItem } from "../MarkPaidModal";
import { TransferModal } from "../../../../../components/web/TransferModal";
import { EditUpcomingEventModal } from "../../../../../components/web/EditUpcomingEventModal";
import { useLocale } from "../../../../../providers/LocaleProvider";
import { TimelineEventItem } from "./types";

interface TimelineModalsProps {
  eventToDelete: { id: string; kind: "INCOME" | "EXPENSE" | "TRANSFER" } | null;
  onCloseDelete: () => void;
  onConfirmDelete: () => void;
  markPaidModalEvent: TimelineEventItem | null;
  onCloseMarkPaid: () => void;
  categories: {
    id: string;
    name: string;
    poolId?: string;
    currentBalance: string | number;
  }[];
  pools: {
    id: string;
    name: string;
    currentBalance: string | number;
    bankAccountId?: string | null;
    poolType?: string;
  }[];
  onConfirmTransferAndPay: (
    transfers: ShortfallTransferItem[],
    destCategoryId: string
  ) => Promise<void>;
  onMarkExpensePaid: (eventId: string, amount: string, date: string) => void;
  onOpenTransferFromMarkPaid: (resolvedPoolId: string) => void;
  transferModalEvent: TimelineEventItem | null;
  onCloseTransfer: () => void;
  onSaveTransferDraft?: (params: {
    eventId: string;
    name: string;
    amount: string;
    expectedDate: string;
  }) => Promise<void>;
  onExecuteTransfer?: (
    eventId: string,
    amount: string,
    name?: string,
    sourcePoolId?: string,
    destinationPoolId?: string
  ) => Promise<void> | void;
  onSkipTransfer?: (eventId: string) => void;
  editEvent: TimelineEventItem | null;
  onCloseEdit: () => void;
}

export function TimelineModals({
  eventToDelete,
  onCloseDelete,
  onConfirmDelete,
  markPaidModalEvent,
  onCloseMarkPaid,
  categories,
  pools,
  onConfirmTransferAndPay,
  onMarkExpensePaid,
  onOpenTransferFromMarkPaid,
  transferModalEvent,
  onCloseTransfer,
  onSaveTransferDraft,
  onExecuteTransfer,
  onSkipTransfer,
  editEvent,
  onCloseEdit,
}: TimelineModalsProps) {
  const { fmt } = useLocale();

  return (
    <>
      <ConfirmDialog
        isOpen={Boolean(eventToDelete)}
        onClose={onCloseDelete}
        onConfirm={onConfirmDelete}
        title={
          eventToDelete?.kind === "INCOME"
            ? "Delete Income"
            : eventToDelete?.kind === "TRANSFER"
            ? "Delete Transfer"
            : "Delete Expense"
        }
        description={
          eventToDelete?.kind === "INCOME"
            ? "Are you sure you want to Delete this Income?"
            : eventToDelete?.kind === "TRANSFER"
            ? "Are you sure you want to Delete this Transfer?"
            : "Are you sure you want to Delete this Expense?"
        }
        confirmLabel="Delete"
        variant="danger"
      />

      {markPaidModalEvent && (() => {
        const resolvedPoolId =
          markPaidModalEvent.poolId ||
          categories.find((c) => c.id === markPaidModalEvent.categoryId)?.poolId ||
          markPaidModalEvent.categoryId ||
          markPaidModalEvent.sourcePoolId ||
          "";
        const matchedPool = pools.find((p) => p.id === resolvedPoolId);

        return (
          <MarkPaidModal
            isOpen={Boolean(markPaidModalEvent)}
            onClose={onCloseMarkPaid}
            billName={markPaidModalEvent.name || "Expense"}
            poolId={resolvedPoolId}
            poolName={matchedPool?.name}
            poolType={(matchedPool as { poolType?: string } | undefined)?.poolType}
            initialAmount={markPaidModalEvent.expectedAmount || "0"}
            initialDate={markPaidModalEvent.expectedDate}
            availableCategories={pools.map((p) => ({
              ...p,
              currentBalance:
                typeof p.currentBalance === "string"
                  ? parseFloat(p.currentBalance || "0")
                  : (p.currentBalance ?? 0),
            }))}
            onConfirmMarkPaid={async ({ amount, date, transfers }) => {
              const nonZeroTransfers = (transfers || []).filter(
                (t) => parseFloat(t.amount || "0") > 0
              );
              if (nonZeroTransfers.length > 0) {
                await onConfirmTransferAndPay(nonZeroTransfers, resolvedPoolId);
              }
              await onMarkExpensePaid(markPaidModalEvent.id, amount.toFixed(2), date);
              onCloseMarkPaid();
            }}
            onOpenTransferModal={() => onOpenTransferFromMarkPaid(resolvedPoolId)}
          />
        );
      })()}

      {transferModalEvent && (
        <TransferModal
          isOpen={Boolean(transferModalEvent)}
          onClose={onCloseTransfer}
          transfer={{
            id: transferModalEvent.id,
            name: transferModalEvent.name || "Transfer",
            expectedAmount: transferModalEvent.expectedAmount || "0",
            expectedDate: transferModalEvent.expectedDate,
            sourcePoolId: transferModalEvent.sourcePoolId,
            sourcePoolName: transferModalEvent.sourcePoolName,
            destinationPoolId: transferModalEvent.destinationPoolId,
            destinationPoolName: transferModalEvent.destinationPoolName,
          }}
          pools={pools.map((p) => ({
            id: p.id,
            name: p.name,
            currentBalance: p.currentBalance,
            bankAccountId: p.bankAccountId,
          }))}
          onSaveDraft={async (params: {
            eventId: string;
            name: string;
            amount: string;
            expectedDate: string;
          }) => {
            if (onSaveTransferDraft) {
              await onSaveTransferDraft(params);
            }
            onCloseTransfer();
          }}
          onConfirmTransfer={async (params: {
            eventId: string;
            name: string;
            amount: string;
            sourcePoolId?: string;
            destinationPoolId?: string;
          }) => {
            if (onExecuteTransfer) {
              await onExecuteTransfer(
                params.eventId,
                params.amount,
                params.name,
                params.sourcePoolId,
                params.destinationPoolId
              );
            }
            onCloseTransfer();
          }}
          onDeleteTransfer={async (eventId: string) => {
            if (onSkipTransfer) {
              onSkipTransfer(eventId);
            }
            onCloseTransfer();
          }}
          formatCurrency={fmt}
        />
      )}

      {editEvent && (
        <EditUpcomingEventModal
          isOpen={Boolean(editEvent)}
          onClose={onCloseEdit}
          event={editEvent}
        />
      )}
    </>
  );
}
