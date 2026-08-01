"use client";

import { useRouter } from "next/navigation";
import { t } from "@money-matters/i18n";
import { Button } from "@money-matters/ui/web";

export interface UpgradePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature: "csv_import" | "file_notes" | "goal_limit" | "history";
}

export function UpgradePromptModal({ isOpen, onClose, feature }: UpgradePromptModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const titles: Record<UpgradePromptModalProps["feature"], string> = {
    csv_import: t("subscription.lockedCsvImportTitle"),
    file_notes: t("subscription.lockedFileNoteTitle"),
    goal_limit: t("subscription.lockedGoalTitle"),
    history: t("subscription.lockedHistoryTitle"),
  };

  const bodies: Record<UpgradePromptModalProps["feature"], string> = {
    csv_import: t("subscription.lockedCsvImportBody"),
    file_notes: t("subscription.lockedFileNoteBody"),
    goal_limit: t("subscription.lockedGoalBody"),
    history: t("subscription.lockedHistoryBody"),
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl border border-zinc-100 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xl font-bold">
            ✨
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 text-lg font-bold"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-bold text-[#1B2B4B]">{titles[feature]}</h2>
          <p className="text-sm text-zinc-600 leading-relaxed">{bodies[feature]}</p>
        </div>

        <div className="flex flex-col gap-2 mt-2">
          <Button
            onClick={() => {
              onClose();
              router.push("/subscription/upgrade");
            }}
            className="w-full bg-[#2563eb] hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg"
          >
            {t("subscription.upgradeCta")}
          </Button>
          <button
            onClick={onClose}
            className="w-full py-2 text-xs font-semibold text-zinc-500 hover:text-zinc-700"
          >
            {t("common.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
