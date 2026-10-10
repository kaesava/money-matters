"use client";

import React, { useState, useDeferredValue } from "react";
import { ShoppingBag, Repeat } from "lucide-react";
import { ModalDialog, AmountField } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";
import { trpc } from "../../lib/trpc";
import { AffordCheckVerdict } from "../../app/dashboard/afford-check/components/AffordCheckVerdict";
import { AffordCheckBreakdown } from "../../app/dashboard/afford-check/components/AffordCheckBreakdown";
import { AffordCheckSkeleton } from "../../app/dashboard/afford-check/components/AffordCheckSkeleton";

interface AffordCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AffordCheckModal({ isOpen, onClose }: AffordCheckModalProps) {
  const [rawAmount, setRawAmount] = useState("");
  const [mode, setMode] = useState<"ONE_OFF" | "RECURRING">("ONE_OFF");
  const [frequency, setFrequency] = useState<"WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "ANNUALLY">("MONTHLY");

  const deferredAmount = useDeferredValue(rawAmount);
  const parsedAmount = parseFloat(deferredAmount);
  const isValidAmount = !isNaN(parsedAmount) && parsedAmount > 0;

  const { data, isLoading } = trpc.canAfford.useQuery(
    {
      amount: deferredAmount,
      mode,
      frequency,
      includePersonal: false,
    },
    {
      enabled: isValidAmount,
      refetchOnWindowFocus: false,
    }
  );

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      title={t("canIAfford.title")}
      maxWidth="max-w-xl"
    >
      <div className="space-y-5">
        {/* Tab Toggle */}
        <div className="flex p-1 bg-slate-100 dark:bg-zinc-800 rounded-xl">
          <button
            type="button"
            onClick={() => setMode("ONE_OFF")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              mode === "ONE_OFF"
                ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs"
                : "text-slate-600 dark:text-zinc-400"
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>{t("canIAfford.modeOneOff")}</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("RECURRING")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              mode === "RECURRING"
                ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs"
                : "text-slate-600 dark:text-zinc-400"
            }`}
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>{t("canIAfford.modeRecurring")}</span>
          </button>
        </div>

        {/* Input Controls */}
        <div className="p-4 bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800 rounded-xl space-y-4">
          <AmountField
            label={mode === "ONE_OFF" ? t("canIAfford.purchaseAmount") : t("canIAfford.recurringAmount")}
            value={rawAmount}
            onChange={setRawAmount}
            required
            autoFocus
          />

          {mode === "RECURRING" && (
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-slate-600 dark:text-zinc-400">
                {t("canIAfford.frequencyLabel")}
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {(["WEEKLY", "FORTNIGHTLY", "MONTHLY", "ANNUALLY"] as const).map((freq) => (
                  <button
                    key={freq}
                    type="button"
                    onClick={() => setFrequency(freq)}
                    className={`py-1.5 px-2 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                      frequency === freq
                        ? "bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-950/60 dark:border-blue-700 dark:text-blue-300"
                        : "border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400"
                    }`}
                  >
                    {t(`recurrence.frequencies.${freq.toLowerCase()}` as Parameters<typeof t>[0])}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Real-Time Verdict Section */}
        {isValidAmount && (
          <div className="space-y-3">
            {isLoading && <AffordCheckSkeleton />}
            {data && (
              <div className="space-y-3 animate-in fade-in duration-200">
                <AffordCheckVerdict data={data} />
                <AffordCheckBreakdown data={data} />
              </div>
            )}
          </div>
        )}
      </div>
    </ModalDialog>
  );
}
