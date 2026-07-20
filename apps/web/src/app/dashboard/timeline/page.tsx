"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "../../../lib/trpc";

function fmt(val: string | number) {
  const num = typeof val === "string" ? parseFloat(val) : val;
  return `$${num.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function TimelinePage() {
  const router = useRouter();

  const eventsQuery = trpc.listIncomeEvents.useQuery();
  const categoriesQuery = trpc.listCategories.useQuery();

  const recordExpenseMutation = trpc.recordExpense.useMutation({
    onSuccess: () => {
      categoriesQuery.refetch();
      setShowBillModal(null);
    },
  });

  const [selectedPaycheck, setSelectedPaycheck] = useState<{ id: string; sourceName: string; amount: string } | null>(null);
  const [showBillModal, setShowBillModal] = useState<{ id: string; name: string; amount: string } | null>(null);
  const [billAmount, setBillAmount] = useState("");
  const [billNote, setBillNote] = useState("");

  const events = eventsQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];

  // Filter to upcoming paychecks
  const upcomingPaychecks = events.filter((e) => e.status === "UPCOMING");

  // Get regular bills
  const regularBills = categories.filter((c) => c.type === "REGULAR");

  const handleMarkPaycheckLanded = () => {
    if (!selectedPaycheck) return;
    router.push(`/dashboard/paychecks/cascade?eventId=${selectedPaycheck.id}&amount=${selectedPaycheck.amount}`);
  };

  const handlePayBill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showBillModal || !billAmount || parseFloat(billAmount) <= 0) return;

    recordExpenseMutation.mutate({
      categoryId: showBillModal.id,
      amount: parseFloat(billAmount).toFixed(2),
      note: billNote.trim() || `Paid ${showBillModal.name} bill`,
      idempotencyKey: `bill-landed-${showBillModal.id}-${Date.now()}`,
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#1B2B4B]">
          Timeline & Scheduled Payments
        </h1>
        <p className="text-sm font-semibold text-zinc-500 mt-1">
          Review upcoming paychecks and confirm regular bill payments.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column: Upcoming Income Paychecks */}
        <div className="flex flex-col gap-4">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">
            Upcoming Income & Paychecks
          </h2>

          {eventsQuery.isLoading ? (
            <div className="h-48 rounded-2xl animate-pulse bg-zinc-200/50" />
          ) : upcomingPaychecks.length === 0 ? (
            <div className="p-8 rounded-2xl bg-white border border-zinc-100 text-center text-sm font-semibold text-zinc-400">
              No upcoming paycheck events.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {upcomingPaychecks.map((evt) => (
                <div
                  key={evt.id}
                  onClick={() => setSelectedPaycheck({ id: evt.id, sourceName: evt.sourceName || "Paycheck", amount: evt.expectedAmount })}
                  className="p-5 rounded-2xl bg-white border border-zinc-100 hover:border-[#00B4A6] cursor-pointer transition-all shadow-sm flex items-center justify-between group"
                >
                  <div className="flex flex-col gap-1">
                    <h3 className="text-sm font-bold text-[#1B2B4B] group-hover:text-[#00B4A6] transition-colors">
                      {evt.sourceName || "Paycheck"}
                    </h3>
                    <span className="text-xs text-zinc-400">
                      Due: {new Date(evt.expectedDate).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-base font-black text-[#1B2B4B]">
                      {fmt(evt.expectedAmount)}
                    </span>
                    <span className="text-xs font-bold text-[#00B4A6] border border-[#00B4A6] px-2 py-0.5 rounded-full">
                      Landed?
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Regular Bills Schedule */}
        <div className="flex flex-col gap-4">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">
            Regular Bill Obligations
          </h2>

          {categoriesQuery.isLoading ? (
            <div className="h-48 rounded-2xl animate-pulse bg-zinc-200/50" />
          ) : regularBills.length === 0 ? (
            <div className="p-8 rounded-2xl bg-white border border-zinc-100 text-center text-sm font-semibold text-zinc-400">
              No regular bill categories configured.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {regularBills.map((bill) => (
                <div
                  key={bill.id}
                  onClick={() => {
                    setShowBillModal({ id: bill.id, name: bill.name, amount: bill.monthlyAmount || "0.00" });
                    setBillAmount(bill.monthlyAmount || "");
                    setBillNote("");
                  }}
                  className="p-5 rounded-2xl bg-white border border-zinc-100 hover:border-[#00B4A6] cursor-pointer transition-all shadow-sm flex items-center justify-between group"
                >
                  <div className="flex flex-col gap-1">
                    <h3 className="text-sm font-bold text-[#1B2B4B] group-hover:text-[#00B4A6] transition-colors">
                      {bill.name}
                    </h3>
                    <span className="text-xs text-zinc-400">
                      Balance: {fmt(bill.currentBalance)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-base font-black text-zinc-500">
                      {bill.monthlyAmount ? `${fmt(bill.monthlyAmount)}/mo` : "—"}
                    </span>
                    <span className="text-xs font-bold text-[#1B2B4B] border border-[#1B2B4B]/20 px-2 py-0.5 rounded-full hover:bg-zinc-50">
                      Pay Bill
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Paycheck Landed Modal */}
      {selectedPaycheck && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedPaycheck(null)}
          />
          <div className="relative pointer-events-auto w-full max-w-sm bg-white shadow-2xl rounded-2xl border border-zinc-200 p-6 flex flex-col gap-5 z-10 animate-in zoom-in-95 duration-200 text-center">
            <span className="text-4xl">💰</span>
            <div className="flex flex-col gap-1.5">
              <h3 className="text-lg font-bold text-[#1B2B4B]">Did this paycheck land?</h3>
              <p className="text-xs text-zinc-400 px-4">
                Confirming will mark {selectedPaycheck.sourceName} ({fmt(selectedPaycheck.amount)}) as landed and take you to split override screen.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={handleMarkPaycheckLanded}
                className="w-full py-3 rounded-xl text-sm font-bold text-white bg-[#00B4A6] hover:opacity-90 active:scale-95 transition-all shadow-md"
              >
                Yes, Landed!
              </button>
              <button
                onClick={() => setSelectedPaycheck(null)}
                className="w-full py-3 rounded-xl text-sm font-bold text-zinc-500 hover:bg-zinc-50 border border-zinc-200 active:scale-95 transition-all"
              >
                No, Not Yet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bill Paid Modal */}
      {showBillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity"
            onClick={() => setShowBillModal(null)}
          />
          <div className="relative pointer-events-auto w-full max-w-md bg-white shadow-2xl rounded-2xl border border-zinc-200 p-6 flex flex-col gap-4 z-10 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#1B2B4B]">Record Bill Payment</h3>
              <button onClick={() => setShowBillModal(null)} className="text-zinc-400 hover:text-zinc-600">
                ✕
              </button>
            </div>

            <form onSubmit={handlePayBill} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-1">Bill Name</label>
                <div className="px-3 py-2 border border-zinc-100 rounded-xl bg-zinc-50/50 text-sm font-bold text-[#1B2B4B]">
                  {showBillModal.name}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-1">Payment Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={billAmount}
                  onChange={(e) => setBillAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[--dash-teal]"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-1">Note (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Netflix fortnightly payment"
                  value={billNote}
                  onChange={(e) => setBillNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-[--dash-teal]"
                />
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setShowBillModal(null)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 text-sm font-bold text-zinc-600 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordExpenseMutation.isPending}
                  className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-[#00B4A6] hover:opacity-90 disabled:opacity-50"
                >
                  {recordExpenseMutation.isPending ? "Recording..." : "Record Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
