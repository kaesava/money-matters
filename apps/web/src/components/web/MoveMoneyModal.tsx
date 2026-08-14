"use client";
import React, { useState, useEffect } from "react";
import { t } from "@money-matters/i18n";
import { trpc } from "../../lib/trpc";
import posthog from "../../lib/posthog-client";
import { Spinner } from "@money-matters/ui/web";

interface MoveMoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function MoveMoneyModal({ isOpen, onClose, onSuccess }: MoveMoneyModalProps) {
  const [sourceCategoryId, setSourceCategoryId] = useState("");
  const [destinationCategoryId, setDestinationCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  const categoriesQuery = trpc.listCategories.useQuery(undefined, { enabled: isOpen });
  const moveMoneyMutation = trpc.moveMoney.useMutation();

  const categories = categoriesQuery.data ?? [];
  const everydayCat = categories.find((c) => c.type === "EVERYDAY");
  // Compute up to 3 live presets moving from Everyday by default
  const presets: { fromId: string; toId: string; amount: string; reason: string }[] = [];
  if (everydayCat) {
    // 1. Deficit categories (negative balance)
    const deficitCats = categories.filter((c) => c.id !== everydayCat.id && parseFloat(c.currentBalance || "0") < 0);
    for (const dCat of deficitCats) {
      if (presets.length >= 3) break;
      const deficitAmt = Math.abs(parseFloat(dCat.currentBalance)).toFixed(2);
      presets.push({
        fromId: everydayCat.id,
        toId: dCat.id,
        amount: deficitAmt,
        reason: `Covering deficit in ${dCat.name}`,
      });
    }

    // 2. If space remaining, categories with health RED/AMBER needing funds
    if (presets.length < 3) {
      const needyCats = categories.filter(
        (c) => c.id !== everydayCat.id &&
               parseFloat(c.currentBalance || "0") >= 0 &&
               (c.healthStatus === "RED" || c.healthStatus === "AMBER")
      );
      for (const nCat of needyCats) {
        if (presets.length >= 3) break;
        const targetAmt = nCat.targetAmount ? parseFloat(nCat.targetAmount) : parseFloat(nCat.monthlyAmount || "0");
        const currentBal = parseFloat(nCat.currentBalance || "0");
        const needed = Math.max(0, targetAmt - currentBal);
        if (needed > 0) {
          presets.push({
            fromId: everydayCat.id,
            toId: nCat.id,
            amount: needed.toFixed(2),
            reason: `Top up ${nCat.name} to target`,
          });
        }
      }
    }
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const applyPreset = (fromId: string, toId: string, presetAmt: string) => {
    setSourceCategoryId(fromId);
    setDestinationCategoryId(toId);
    setAmount(presetAmt);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!sourceCategoryId || !destinationCategoryId || !amount || parseFloat(amount) <= 0) {
      setError("Please select source, destination, and a valid amount.");
      return;
    }
    if (sourceCategoryId === destinationCategoryId) {
      setError("Source and destination categories must be different.");
      return;
    }

    const sourceCat = categories.find((c) => c.id === sourceCategoryId);
    if (sourceCat) {
      const sourceBal = parseFloat(sourceCat.currentBalance || "0");
      const transferAmt = parseFloat(amount);
      if (transferAmt > sourceBal) {
        if (!confirm(`Warning: Transferring $${transferAmt.toFixed(2)} exceeds "${sourceCat.name}" balance ($${sourceBal.toFixed(2)}). Source category balance will become negative ($${(sourceBal - transferAmt).toFixed(2)}). Proceed?`)) {
          return;
        }
      }
    }

    try {
      await moveMoneyMutation.mutateAsync({
        sourceCategoryId,
        destinationCategoryId,
        amount: parseFloat(amount).toFixed(2),
      });
      posthog.capture("money_moved_between_categories", {
        amount: parseFloat(amount),
        source_category_type: sourceCat?.type,
        destination_category_type: categories.find((category) => category.id === destinationCategoryId)?.type,
      });
      setSourceCategoryId("");
      setDestinationCategoryId("");
      setAmount("");
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to move money.";
      setError(message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-zinc-100 p-6 flex flex-col gap-6 z-10 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔄</span>
            <h2 className="text-lg font-bold text-[#1B2B4B]">{t('modals.moveMoney.title')}</h2>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 font-bold p-1">
            ✕
          </button>
        </div>

        {error && <div className="p-3 rounded-xl bg-red-50 text-red-600 text-xs font-bold">{error}</div>}

        {presets.length > 0 && (
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">
              ⚡ Recommended Presets
            </label>
            <div className="flex flex-col gap-1.5">
              {presets.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => applyPreset(p.fromId, p.toId, p.amount)}
                  className="px-3 py-2 rounded-xl bg-teal-50/70 border border-teal-200 text-[#00B4A6] hover:bg-teal-100 transition-all text-left flex items-center justify-between"
                >
                  <span className="text-xs font-bold">{p.reason}</span>
                  <span className="text-xs font-mono font-black">${p.amount}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">{t('modals.moveMoney.sourceCategory')}</label>
            <select
              value={sourceCategoryId}
              onChange={(e) => setSourceCategoryId(e.target.value)}
              required
              className="px-4 py-2.5 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
            >
              <option value="">Select Source Category...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (${parseFloat(c.currentBalance).toFixed(2)})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">{t('modals.moveMoney.destinationCategory')}</label>
            <select
              value={destinationCategoryId}
              onChange={(e) => setDestinationCategoryId(e.target.value)}
              required
              className="px-4 py-2.5 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
            >
              <option value="">Select Target Category...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (${parseFloat(c.currentBalance).toFixed(2)})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">{t('modals.moveMoney.amount')}</label>
            <input
              type="number"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="px-4 py-2.5 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
            />
          </div>

          {/* Payday Safety Guard */}
          {everydayCat && sourceCategoryId === everydayCat.id && parseFloat(amount || "0") > 0 && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs gap-1 flex flex-col">
              <span className="font-bold text-amber-900">🛡️ Payday Safety Guard</span>
              <span>
                Moving ${(parseFloat(amount)).toFixed(2)} leaves ${Math.max(0, parseFloat(everydayCat.currentBalance || "0") - parseFloat(amount)).toFixed(2)} in Everyday spending cash.
              </span>
            </div>
          )}

          <button
            type="submit"
            disabled={moveMoneyMutation.isPending}
            className="mt-2 py-3 rounded-xl font-bold text-sm text-white bg-[#00B4A6] hover:opacity-90 active:scale-95 disabled:opacity-50 transition-all shadow-md flex items-center justify-center gap-1.5"
          >
            {moveMoneyMutation.isPending && <Spinner size="sm" />}
            {t('modals.moveMoney.submit')}
          </button>
        </form>
      </div>
    </div>
  );
}
