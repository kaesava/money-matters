"use client";

import React from "react";
import { ConfirmDialog } from "@money-matters/ui/web";

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
      title="Discard Changes?"
      description="Are you sure you want to leave setup? Any un-saved setup changes will be discarded."
      confirmLabel="Discard Changes"
      cancelLabel="Keep Editing"
      variant="danger"
    />
  );
}
