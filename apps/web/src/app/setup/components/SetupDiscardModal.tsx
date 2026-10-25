import React from "react";
import { ConfirmDialog } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";

interface SetupDiscardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function SetupDiscardModal({ isOpen, onClose, onConfirm }: SetupDiscardModalProps) {
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
    />
  );
}
