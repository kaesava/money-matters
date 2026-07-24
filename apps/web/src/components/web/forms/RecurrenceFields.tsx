import React from "react";

interface RecurrenceFieldsProps {
  isRecurring: boolean;
  setIsRecurring: (val: boolean) => void;
  frequency: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "ANNUALLY";
  setFrequency: (val: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "ANNUALLY") => void;
  startDate: string;
  setStartDate: (val: string) => void;
}

export function RecurrenceFields({
  isRecurring,
  setIsRecurring,
  frequency,
  setFrequency,
  startDate,
  setStartDate,
}: RecurrenceFieldsProps) {
  return (
    <div className="flex flex-col gap-3 pt-3 border-t border-zinc-100">
      <div className="flex items-center justify-between">
        <label className="text-xs font-extrabold uppercase tracking-wider text-[#1B2B4B]">
          Recurrence Schedule
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsRecurring(true)}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
              isRecurring ? "bg-[#1B2B4B] text-white shadow-sm" : "bg-zinc-100 text-zinc-600"
            }`}
          >
            Recurring
          </button>
          <button
            type="button"
            onClick={() => setIsRecurring(false)}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
              !isRecurring ? "bg-[#1B2B4B] text-white shadow-sm" : "bg-zinc-100 text-zinc-600"
            }`}
          >
            One-off
          </button>
        </div>
      </div>

      {isRecurring ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Frequency
            </label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "ANNUALLY")}
              className="px-4 py-2.5 text-xs font-bold rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6] text-zinc-900"
            >
              <option value="WEEKLY">Weekly</option>
              <option value="FORTNIGHTLY">Fortnightly</option>
              <option value="MONTHLY">Monthly</option>
              <option value="ANNUALLY">Annually (Yearly)</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              First Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-4 py-2.5 text-xs font-bold rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6] text-zinc-900"
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
            Event Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-4 py-2.5 text-xs font-bold rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6] text-zinc-900"
          />
        </div>
      )}
    </div>
  );
}
