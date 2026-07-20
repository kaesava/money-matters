"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "../../../lib/trpc";
import { DashboardError } from "../../../components/web/DashboardError";

type IncomeType = "SALARY" | "WAGES" | "FREELANCE" | "OTHER";

function fmt(val: string | number) {
  const num = typeof val === "string" ? parseFloat(val) : val;
  return `$${num.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function PaychecksPage() {
  const router = useRouter();

  // Strategic Fix: Move queries to the top so we can leverage their inferred types immediately
  const sourcesQuery = trpc.listIncomeSources.useQuery();
  const eventsQuery = trpc.listIncomeEvents.useQuery();
  const sources = sourcesQuery.data ?? [];
  const events = eventsQuery.data ?? [];

  // Dialog State
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Strategic Fix: Use typeof to grab the exact inferred type from the array
  const [editingSource, setEditingSource] = useState<typeof sources[number] | null>(null);

  // Form Fields
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<IncomeType>("SALARY");
  const [isRecurring, setIsRecurring] = useState(true);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [frequency, setFrequency] = useState("FORTNIGHTLY");

  const createScheduleMutation = trpc.createIncomeSourceSchedule.useMutation();
  const createEventMutation = trpc.createIncomeEvent.useMutation();

  const createSourceMutation = trpc.createIncomeSource.useMutation({
    onSuccess: async (newSource) => {
      if (isRecurring) {
        let rrule = "FREQ=WEEKLY;INTERVAL=2"; // default fortnightly
        if (frequency === "WEEKLY") rrule = "FREQ=WEEKLY";
        else if (frequency === "MONTHLY") rrule = "FREQ=MONTHLY";
        else if (frequency === "ANNUALLY") rrule = "FREQ=YEARLY";

        await createScheduleMutation.mutateAsync({
          incomeSourceId: newSource.id,
          rrule,
          startDate: new Date(startDate).toISOString(),
        });
      } else {
        await createEventMutation.mutateAsync({
          incomeSourceId: newSource.id,
          expectedAmount: parseFloat(amount).toFixed(2),
          expectedDate: new Date(startDate).toISOString(),
        });
      }
      resetForm();
      sourcesQuery.refetch();
      eventsQuery.refetch();
    },
  });

  const updateSourceMutation = trpc.updateIncomeSource.useMutation({
    onSuccess: () => {
      resetForm();
      sourcesQuery.refetch();
      eventsQuery.refetch();
    },
  });

  const archiveSourceMutation = trpc.archiveIncomeSource.useMutation({
    onSuccess: () => {
      resetForm();
      sourcesQuery.refetch();
      eventsQuery.refetch();
    },
  });

  const runAllocationMutation = trpc.runAllocation.useMutation({
    onSuccess: () => {
      eventsQuery.refetch();
    },
  });

  const resetForm = () => {
    setShowAddModal(false);
    setEditingSource(null);
    setName("");
    setAmount("");
    setType("SALARY");
    setIsRecurring(true);
    setStartDate(new Date().toISOString().split("T")[0]);
    setFrequency("FORTNIGHTLY");
  };

  const handleCreateSource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !amount || parseFloat(amount) <= 0) return;
    createSourceMutation.mutate({
      name: name.trim(),
      type,
      amount: parseFloat(amount).toFixed(2),
    });
  };

  const handleUpdateSource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSource || !name.trim() || !amount || parseFloat(amount) <= 0) return;
    updateSourceMutation.mutate({
      id: editingSource.id,
      data: {
        name: name.trim(),
        type,
        amount: parseFloat(amount).toFixed(2),
      },
    });
  };

  const handleEditClick = (src: typeof sources[number]) => {
    setEditingSource(src);
    setName(src.name);
    setAmount(parseFloat(src.amount.toString()).toFixed(2));
    setType(src.type as IncomeType);
    setIsRecurring(!!src.rrule);
    if (src.startDate) {
      setStartDate(src.startDate.split("T")[0]);
    }
    if (src.rrule) {
      if (src.rrule.includes("INTERVAL=2")) setFrequency("FORTNIGHTLY");
      else if (src.rrule.includes("YEARLY")) setFrequency("ANNUALLY");
      else if (src.rrule.includes("MONTHLY")) setFrequency("MONTHLY");
      else setFrequency("WEEKLY");
    }
  };

  const handleRunAllocation = (eventId: string, expectedAmount: string) => {
    router.push(`/dashboard/paychecks/cascade?eventId=${eventId}&amount=${expectedAmount}`);
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#1B2B4B]">
            Income Sources & Scheduled Deposits
          </h1>
          <p className="text-sm font-semibold text-zinc-500 mt-1">
            Manage your recurring salaries, wages, freelance incomes, or one-off bonuses.
          </p>
        </div>

        <button
          onClick={() => { resetForm(); setShowAddModal(true); }}
          className="px-4 py-2.5 rounded-xl font-bold text-sm text-white shadow-md transition-all hover:opacity-90 active:scale-95 bg-[#00B4A6] flex items-center justify-center gap-2"
        >
          <span>+</span>
          <span>Add Income Source</span>
        </button>
      </div>

      {/* Income Sources List */}
      <div className="flex flex-col gap-4">
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">
          Income Sources
        </h2>

        {sourcesQuery.isLoading ? (
          <div className="h-24 rounded-2xl animate-pulse bg-zinc-200/50" />
        ) : sourcesQuery.error ? (
          <DashboardError error={sourcesQuery.error} onRetry={() => sourcesQuery.refetch()} compact />
        ) : sources.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white border border-zinc-100 text-center flex flex-col items-center gap-2">
            <span className="text-3xl">💵</span>
            <p className="text-sm font-semibold text-zinc-700">No income sources configured yet.</p>
            <p className="text-xs text-zinc-400">Add your regular salary or wages to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Strategic Fix: Implicitly mapped parameter, no typing required! */}
            {sources.map((src) => (
              <div
                key={src.id}
                className="p-5 rounded-2xl bg-white border border-zinc-100 shadow-sm flex items-center justify-between hover:border-zinc-200 transition-all group"
              >
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#00B4A6]">
                    {src.type} {src.rrule ? `• ${src.rrule.includes("INTERVAL=2") ? "Fortnightly" : "Recurring"}` : "• One-off"}
                  </span>
                  <h3 className="text-base font-bold text-[#1B2B4B]">{src.name}</h3>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xl font-black text-[#1B2B4B]">
                    {fmt(src.amount.toString())}
                  </span>
                  <button
                    onClick={() => handleEditClick(src)}
                    className="text-xs font-bold text-zinc-400 hover:text-[#1B2B4B] opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming Paycheck Events & Waterfall Allocations */}
      <div className="flex flex-col gap-4">
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">
          Scheduled Deposits & allocations
        </h2>

        {eventsQuery.isLoading ? (
          <div className="h-24 rounded-2xl animate-pulse bg-zinc-200/50" />
        ) : events.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white border border-zinc-100 text-center text-xs text-zinc-400">
            No upcoming paycheck events recorded yet.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {events.map((evt) => (
              <div
                key={evt.id}
                className="p-5 rounded-2xl bg-white border border-zinc-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#1B2B4B]">
                      {evt.sourceName || "Paycheck"}
                    </span>
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                        evt.status === "CONFIRMED"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {evt.status}
                    </span>
                  </div>
                  <span className="text-xs text-zinc-400">
                    Expected: {new Date(evt.expectedDate).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-lg font-black text-[#1B2B4B]">
                    {fmt(evt.expectedAmount)}
                  </span>
                  {evt.status !== "CONFIRMED" && (
                    <button
                      onClick={() => handleRunAllocation(evt.id, evt.expectedAmount)}
                      disabled={runAllocationMutation.isPending}
                      className="px-3.5 py-2 rounded-xl font-bold text-xs text-white bg-[#00B4A6] hover:opacity-90 active:scale-95 disabled:opacity-50 transition-all shadow-sm"
                    >
                      {runAllocationMutation.isPending ? "Allocating..." : "Run Cascade"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Income Source Modal */}
      {(showAddModal || editingSource) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity"
            onClick={resetForm}
          />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-zinc-100 p-6 flex flex-col gap-6 z-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#1B2B4B]">
                {editingSource ? "Edit Income Source" : "New Income Source"}
              </h2>
              <button
                onClick={resetForm}
                className="text-zinc-400 hover:text-zinc-600 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={editingSource ? handleUpdateSource : handleCreateSource} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Primary Salary"
                  className="px-4 py-2.5 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as IncomeType)}
                  className="px-4 py-2.5 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
                >
                  <option value="SALARY">Salary</option>
                  <option value="WAGES">Wages</option>
                  <option value="FREELANCE">Freelance</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Expected Net Amount ($)</label>
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

              {!editingSource && (
                <>
                  <div className="flex items-center gap-2 py-1">
                    <input
                      type="checkbox"
                      id="isRecurring"
                      checked={isRecurring}
                      onChange={(e) => setIsRecurring(e.target.checked)}
                      className="w-4 h-4 rounded text-[#00B4A6] focus:ring-[#00B4A6]"
                    />
                    <label htmlFor="isRecurring" className="text-xs font-bold text-zinc-600 select-none">
                      Is this a recurring deposit?
                    </label>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                      {isRecurring ? "Starting Date" : "Deposit Date"}
                    </label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="px-4 py-2.5 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
                    />
                  </div>

                  {isRecurring && (
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Frequency</label>
                      <select
                        value={frequency}
                        onChange={(e) => setFrequency(e.target.value)}
                        className="px-4 py-2.5 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
                      >
                        <option value="WEEKLY">Weekly</option>
                        <option value="FORTNIGHTLY">Fortnightly</option>
                        <option value="MONTHLY">Monthly</option>
                        <option value="ANNUALLY">Annually</option>
                      </select>
                    </div>
                  )}
                </>
              )}

              <div className="flex flex-col gap-2 mt-2">
                <button
                  type="submit"
                  disabled={createSourceMutation.isPending || updateSourceMutation.isPending}
                  className="w-full py-3 rounded-xl font-bold text-sm text-white bg-[#00B4A6] hover:opacity-90 active:scale-95 disabled:opacity-50 transition-all shadow-md"
                >
                  {editingSource ? "Save Changes" : "Save Income Source"}
                </button>

                {editingSource && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this income source?")) {
                        archiveSourceMutation.mutate({ id: editingSource.id });
                      }
                    }}
                    className="w-full py-3 rounded-xl font-bold text-sm text-red-500 border border-red-200 hover:bg-red-50 transition-all"
                  >
                    Delete Income Source
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
