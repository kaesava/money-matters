import React from "react";
import { ModalDialog } from "../ModalDialog";

interface PaydayReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryName: string;
  reasoning: string;
}

export function PaydayReasonModal({
  isOpen,
  onClose,
  categoryName,
  reasoning,
}: PaydayReasonModalProps) {
  if (!isOpen) return null;

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Allocation Reasoning: ${categoryName}`}
      subtitle="Full automated waterfall strategy calculation"
      isDirty={false}
      onSave={onClose}
    >
      <div className="flex flex-col gap-4 text-zinc-900">
        <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-teal-950 text-xs font-semibold leading-relaxed whitespace-pre-wrap">
          {reasoning || "Standard scheduled budget target allocation."}
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-[#00B4A6] text-white hover:bg-[#009b8f]"
          >
            Close
          </button>
        </div>
      </div>
    </ModalDialog>
  );
}
