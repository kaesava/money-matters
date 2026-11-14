import React from "react";
import { ConfirmDialog } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";

interface SetupDiscardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function SetupDiscardModal({ isOpen, onClose, onConfirm, isLoading = false }: SetupDiscardModalProps) {
  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={t("setup.cancelSetupConfirmTitle")}
      description={t("setup.cancelSetupConfirmMessage")}
      confirmLabel={t("common.discard")}
      cancelLabel={t("common.cancel")}
      variant="danger"
      isLoading={isLoading}
    />
  );
}
