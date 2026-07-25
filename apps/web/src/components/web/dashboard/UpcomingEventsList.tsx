import React from "react";

export interface UpcomingEvent {
  id: string;
  type: "INCOME" | "EXPENSE";
  name: string;
  expectedDate: string;
  expectedAmount: string;
  categoryName: string;
  categoryId: string | null;
  note: string;
  isNextPayday: boolean;
  isRecurring?: boolean;
}

interface UpcomingEventsListProps {
  events: UpcomingEvent[];
  selectedEventKeys: string[];
  setSelectedEventKeys: React.Dispatch<React.SetStateAction<string[]>>;
  upcomingFilter: "ALL" | "INCOME" | "EXPENSE";
  setUpcomingFilter: (filter: "ALL" | "INCOME" | "EXPENSE") => void;
  upcomingSearch: string;
  setUpcomingSearch: (search: string) => void;
  isPendingSkip: boolean;
  onBulkSkip: () => void;
  onProcessPayday: (evt: UpcomingEvent) => void;
  onMarkPaid: (evt: UpcomingEvent) => void;
  fmt: (val: string | number) => string;
  fmtAUDate: (dStr: string) => string;
  todayStr: string;
}

export function UpcomingEventsList({
  events,
  selectedEventKeys,
  setSelectedEventKeys,
  upcomingFilter,
  setUpcomingFilter,
  upcomingSearch,
  setUpcomingSearch,
  isPendingSkip,
  onBulkSkip,
  onProcessPayday,
  onMarkPaid,
  fmt,
  fmtAUDate,
  todayStr,
}: UpcomingEventsListProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#1B2B4B]">Upcoming Events</h2>
          <p className="text-xs text-zinc-500 font-semibold">Scheduled income deposits & upcoming bill payments</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {selectedEventKeys.length > 0 && (
            <button
              onClick={onBulkSkip}
              disabled={isPendingSkip}
              className="px-3 py-1.5 rounded-xl bg-amber-500 text-white font-bold text-xs shadow-sm hover:bg-amber-600 transition-all"
            >
              Bulk Skip ({selectedEventKeys.length})
            </button>
          )}

          <input
            type="text"
            placeholder="Search upcoming..."
            value={upcomingSearch}
            onChange={(e) => setUpcomingSearch(e.target.value)}
            className="px-3.5 py-2 text-xs rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
          />

          <div className="flex bg-zinc-100 p-1 rounded-xl">
            {(["ALL", "INCOME", "EXPENSE"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setUpcomingFilter(tab)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  upcomingFilter === tab ? "bg-white text-[#1B2B4B] shadow-sm" : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                {tab === "ALL" ? "All" : tab === "INCOME" ? "Income & Paychecks" : "Bills & Expenses"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="p-8 rounded-2xl bg-white border border-zinc-100 text-center text-xs text-zinc-400">
          No upcoming events found.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {events.map((evt) => {
            const isOverdue = evt.expectedDate < todayStr;
            const eventKey = `${evt.type}-${evt.id}`;
            const isSelected = selectedEventKeys.includes(eventKey);
            const isNextPayday = evt.isNextPayday;

            return (
              <div
                key={eventKey}
                className={`p-4 rounded-2xl bg-white border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                  isOverdue ? "border-amber-300 bg-amber-50/20" : "border-zinc-100"
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedEventKeys((prev) => [...prev, eventKey]);
                      } else {
                        setSelectedEventKeys((prev) => prev.filter((k) => k !== eventKey));
                      }
                    }}
                    className="w-4 h-4 rounded-lg border-zinc-300 text-[#00B4A6] focus:ring-[#00B4A6]"
                  />
                  <span className="text-2xl">{evt.type === "INCOME" ? "💵" : "📄"}</span>
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-[#1B2B4B]">{evt.name}</span>
                      {isOverdue && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                          ACTION REQUIRED
                        </span>
                      )}
                      {evt.type === "INCOME" && isNextPayday && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#00B4A6]/20 text-[#00B4A6] border border-[#00B4A6]/40">
                          NEXT PAYDAY
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          evt.type === "INCOME" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {evt.type}
                      </span>
                    </div>
                    <span className="text-xs text-zinc-400">
                      Date: {fmtAUDate(evt.expectedDate)} • Category: {evt.categoryName} • {evt.note}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`text-lg font-black ${evt.type === "INCOME" ? "text-emerald-600" : "text-[#1B2B4B]"}`}>
                    {evt.type === "INCOME" ? "+" : "-"}{fmt(evt.expectedAmount)}
                  </span>

                  {evt.type === "INCOME" ? (
                    <button
                      onClick={() => onProcessPayday(evt)}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-[#00B4A6] hover:opacity-90 transition-all shadow-sm"
                    >
                      Process Payday / Edit
                    </button>
                  ) : (
                    <button
                      onClick={() => onMarkPaid(evt)}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-[#1B2B4B] hover:opacity-90 transition-all shadow-sm"
                    >
                      Edit / Mark Paid
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
