"use client";
import React, { useState, useEffect } from "react";
import { trpc } from "../../lib/trpc";

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
  const maxSavingsCat = [...categories]
    .filter((c) => c.type !== "EVERYDAY" && parseFloat(c.currentBalance || "0") > 0)
    .sort((a, b) => parseFloat(b.currentBalance || "0") - parseFloat(a.currentBalance || "0"))[0];

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
            <h2 className="text-lg font-bold text-[#1B2B4B]">Move Money</h2>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 font-bold p-1">
            ✕
          </button>
        </div>

        {error && <div className="p-3 rounded-xl bg-red-50 text-red-600 text-xs font-bold">{error}</div>}

        {everydayCat && maxSavingsCat && (
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">
              ⚡ 1-Tap Quick Presets
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => applyPreset(maxSavingsCat.id, everydayCat.id, "50")}
                className="px-3 py-1.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-700 font-bold text-xs hover:bg-sky-100 transition-all"
              >
                Top Up Everyday ($50)
              </button>
              <button
                type="button"
                onClick={() => applyPreset(maxSavingsCat.id, everydayCat.id, "100")}
                className="px-3 py-1.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-700 font-bold text-xs hover:bg-sky-100 transition-all"
              >
                Top Up Everyday ($100)
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">From Category</label>
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
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">To Category</label>
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
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Amount ($)</label>
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

          <button
            type="submit"
            disabled={moveMoneyMutation.isPending}
            className="mt-2 py-3 rounded-xl font-bold text-sm text-white bg-[#00B4A6] hover:opacity-90 active:scale-95 disabled:opacity-50 transition-all shadow-md"
          >
            {moveMoneyMutation.isPending ? "Transferring..." : "Confirm Move Money"}
          </button>
        </form>
      </div>
    </div>
  );
}
