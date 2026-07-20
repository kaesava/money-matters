"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { t } from "@money-matters/i18n";
import { trpc } from "../../../lib/trpc";
import { DashboardError } from "../../../components/web/DashboardError";

type IncomeType = "SALARY" | "WAGES" | "FREELANCE" | "OTHER";

function fmt(val: string | number) {
  const num = typeof val === "string" ? parseFloat(val) : val;
  return `$${num.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function PaychecksPage() {
  const router = useRouter();
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<IncomeType>("SALARY");

  const sourcesQuery = trpc.listIncomeSources.useQuery();
  const eventsQuery = trpc.listIncomeEvents.useQuery();

  const createSourceMutation = trpc.createIncomeSource.useMutation({
    onSuccess: () => {
      setShowAddModal(false);
      setName("");
      setAmount("");
      sourcesQuery.refetch();
      eventsQuery.refetch();
    },
  });

  const runAllocationMutation = trpc.runAllocation.useMutation({
    onSuccess: () => {
      eventsQuery.refetch();
    },
  });

  const handleCreateSource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !amount || parseFloat(amount) <= 0) return;
    createSourceMutation.mutate({
      name: name.trim(),
      type,
      amount: parseFloat(amount).toFixed(2),
    });
  };

  const handleRunAllocation = (eventId: string, expectedAmount: string) => {
    router.push(`/dashboard/paychecks/cascade?eventId=${eventId}&amount=${expectedAmount}`);
  };

  const sources = sourcesQuery.data ?? [];
  const events = eventsQuery.data ?? [];

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#1B2B4B]">
            {t("paychecks.title", { defaultValue: "Paychecks & Income" })}
          </h1>
          <p className="text-sm font-semibold text-zinc-500 mt-1">
            Manage your recurring salary and trigger paycheck waterfall allocations.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
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
            {sources.map((src) => (
              <div
                key={src.id}
                className="p-5 rounded-2xl bg-white border border-zinc-100 shadow-sm flex items-center justify-between"
              >
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#00B4A6]">
                    {src.type}
                  </span>
                  <h3 className="text-base font-bold text-[#1B2B4B]">{src.name}</h3>
                </div>
                <span className="text-xl font-black text-[#1B2B4B]">
                  {fmt(src.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming Paycheck Events & Waterfall Allocations */}
      <div className="flex flex-col gap-4">
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">
          Paycheck Events & Allocations
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
                      {runAllocationMutation.isPending ? "Allocating..." : "Run Waterfall"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Income Source Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity"
            onClick={(e) => { if (e.target === e.currentTarget) setShowAddModal(false); }}
          />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-zinc-100 p-6 flex flex-col gap-6 z-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#1B2B4B]">New Income Source</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-zinc-400 hover:text-zinc-600 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSource} className="flex flex-col gap-4">
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

              <button
                type="submit"
                disabled={createSourceMutation.isPending}
                className="mt-2 py-3 rounded-xl font-bold text-sm text-white bg-[#00B4A6] hover:opacity-90 active:scale-95 disabled:opacity-50 transition-all shadow-md"
              >
                {createSourceMutation.isPending ? "Creating..." : "Save Income Source"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
