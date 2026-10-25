import React from "react";
import { t } from "@money-matters/i18n";
import { ModalDialog, Button, formatCurrency } from "@money-matters/ui/web";

interface SetupBalanceSweepModalProps {
  activeSweepPool: { id: string; name: string; balance: number } | null;
  availablePools: Array<{ id: string; name: string; isSurplusTarget?: boolean }>;
  selectedSweepDest: string;
  onSelectDest: (id: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export function SetupBalanceSweepModal({
  activeSweepPool,
  availablePools,
  selectedSweepDest,
  onSelectDest,
  onCancel,
  onConfirm,
}: SetupBalanceSweepModalProps) {
  if (!activeSweepPool) return null;

  return (
    <ModalDialog
      isOpen={Boolean(activeSweepPool)}
      onClose={onCancel}
      title={t("setup.sweepModalTitle")}
      maxWidthClass="max-w-md"
    >
      <div className="space-y-4">
        <p className="text-xs text-slate-600 leading-relaxed">
          {t("setup.sweepModalDesc", {
            poolName: activeSweepPool.name,
            balance: formatCurrency(activeSweepPool.balance),
          })}
        </p>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">
            {t("setup.sweepDestinationLabel")}
          </label>
          <select
            value={selectedSweepDest}
            onChange={(e) => onSelectDest(e.target.value)}
            className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
          >
            {availablePools
              .filter((p) => p.id !== activeSweepPool.id)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.isSurplusTarget ? `(${t("setup.goals.surplusTargetBadge")})` : ""}
                </option>
              ))}
          </select>
        </div>
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={onConfirm}
          >
            {t("setup.sweepConfirmButton")}
          </Button>
        </div>
      </div>
    </ModalDialog>
  );
}
