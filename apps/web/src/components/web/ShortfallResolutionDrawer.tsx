"use client";
import React, { useState, useEffect } from "react";
import { SlideOverDrawer } from "@money-matters/ui/web";
import { trpc } from "../../lib/trpc";

interface ShortfallResolutionDrawerProps {
  categoryId: string;
  onClose: () => void;
}

export function ShortfallResolutionDrawer({ categoryId, onClose }: ShortfallResolutionDrawerProps) {
  const categoriesQuery = trpc.listCategories.useQuery();
  const resolveShortfall = trpc.resolveShortfall.useMutation();

  const categories = categoriesQuery.data ?? [];
  const targetCat = categories.find((c) => c.id === categoryId);
  const targetBalance = targetCat ? parseFloat(targetCat.currentBalance) : 0;
  const shortfallAmount = targetBalance < 0 ? Math.abs(targetBalance) : 0;

  // Donor lookup: categories with positive balance
  const potentialDonors = categories.filter(
    (c) => c.id !== categoryId && parseFloat(c.currentBalance) > 0
  );

  // Recommended donor: sort by lowest priority (everyday/no-priority first, then high priorityRank number, then highest balance)
  const sortedDonors = [...potentialDonors].sort((a, b) => {
    const priorityA = a.type === "EVERYDAY" ? 9999 : (a.priorityRank ?? 999);
    const priorityB = b.type === "EVERYDAY" ? 9999 : (b.priorityRank ?? 999);

    if (priorityA !== priorityB) {
      return priorityB - priorityA; // Lower priority (higher priority number) first
    }
    return parseFloat(b.currentBalance) - parseFloat(a.currentBalance);
  });

  const recommendedDonor = sortedDonors[0];
  const [donorId, setDonorId] = useState("");
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (recommendedDonor) {
      setDonorId(recommendedDonor.id);
    }
    if (shortfallAmount > 0) {
      setAmount(shortfallAmount.toFixed(2));
    }
  }, [recommendedDonor, shortfallAmount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!donorId || !amount) return;

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    setIsSubmitting(true);
    try {
      await resolveShortfall.mutateAsync({
        donorCategoryId: donorId,
        recipientCategoryId: categoryId,
        borrowedAmount: amountNum.toFixed(2),
      });
      categoriesQuery.refetch();
      onClose();
    } catch (err) {
      console.error("Failed to resolve shortfall:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!targetCat) return null;

  return (
    <SlideOverDrawer
      title="Shortfall Resolution"
      subtitle={`Fix negative balance in: ${targetCat.name}`}
      onClose={onClose}
      widthClass="max-w-md"
    >
      <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6">
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 flex flex-col gap-1">
          <span className="text-[10px] font-extrabold text-rose-600 uppercase">Shortfall amount</span>
          <span className="text-2xl font-black text-rose-700">${shortfallAmount.toFixed(2)}</span>
        </div>

        {potentialDonors.length === 0 ? (
          <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 text-center">
            <p className="text-xs text-zinc-500 font-bold">
              No categories have a positive balance. You must log a paycheck first to cover the deficit.
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-extrabold text-[#1B2B4B] uppercase">Borrow From Category</label>
              <select
                value={donorId}
                onChange={(e) => setDonorId(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:border-[#00B4A6] bg-white transition-colors"
              >
                {sortedDonors.map((donor) => (
                  <option key={donor.id} value={donor.id}>
                    {donor.name} (Balance: ${parseFloat(donor.currentBalance).toFixed(2)}) 
                    {donor.id === recommendedDonor?.id ? " [Recommended]" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-extrabold text-[#1B2B4B] uppercase">Amount to Transfer</label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:border-[#00B4A6] bg-white transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !donorId}
              style={{ backgroundColor: "var(--dash-teal)" }}
              className="w-full text-white py-3 rounded-xl font-bold text-xs hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-50 mt-4"
            >
              {isSubmitting ? "Rebalancing..." : "Confirm Rebalance"}
            </button>
          </>
        )}
      </form>
    </SlideOverDrawer>
  );
}
