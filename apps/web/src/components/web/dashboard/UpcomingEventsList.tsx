import React, { useState } from "react";
import { SearchInput, fmtDate } from "@money-matters/ui/web";

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
  seriesId?: string;
  seriesName?: string;
}

interface UpcomingEventsListProps {
  events: UpcomingEvent[];
  selectedEventKeys: string[];
  setSelectedEventKeys: React.Dispatch<React.SetStateAction<string[]>>;
  upcomingFilter: "ALL" | "INCOME" | "EXPENSE";
  setUpcomingFilter: (filter: "ALL" | "INCOME" | "EXPENSE") => void;
  upcomingSearch: string;
  setUpcomingSearch: (search: string) => void;
  isPendingDelete: boolean;
  onBulkDelete: () => void;
  onProcessPayday: (evt: UpcomingEvent) => void;
  onMarkPaid: (evt: UpcomingEvent) => void;
  fmt: (val: string | number) => string;
  _fmtAUDate?: (dStr: string) => string;
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
  isPendingDelete,
  onBulkDelete,
  onProcessPayday,
  onMarkPaid,
  fmt,
  _fmtAUDate,
  todayStr,
}: UpcomingEventsListProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Group unique recurring series across events
  const seriesMap = new Map<string, { key: string; name: string; type: "INCOME" | "EXPENSE"; eventKeys: string[] }>();
  events.forEach((evt) => {
    if (evt.isRecurring === false) return;
    const sId = evt.seriesId || evt.name;
    const seriesKey = `${evt.type}-${sId}`;
    const eventKey = `${evt.type}-${evt.id}`;
    if (!seriesMap.has(seriesKey)) {
      seriesMap.set(seriesKey, {
        key: seriesKey,
        name: evt.seriesName || evt.name,
        type: evt.type,
        eventKeys: [],
      });
    }
    seriesMap.get(seriesKey)!.eventKeys.push(eventKey);
  });

  const seriesList = Array.from(seriesMap.values());

  const handleToggleSeries = (seriesKey: string) => {
    const s = seriesMap.get(seriesKey);
    if (!s) return;
    const allSelected = s.eventKeys.every((k) => selectedEventKeys.includes(k));
    if (allSelected) {
      setSelectedEventKeys((prev) => prev.filter((k) => !s.eventKeys.includes(k)));
    } else {
      setSelectedEventKeys((prev) => Array.from(new Set([...prev, ...s.eventKeys])));
    }
  };

  const handleSelectAllVisible = () => {
    const allVisibleKeys = events.map((evt) => `${evt.type}-${evt.id}`);
    const allSelected = allVisibleKeys.every((k) => selectedEventKeys.includes(k));
    if (allSelected) {
      setSelectedEventKeys((prev) => prev.filter((k) => !allVisibleKeys.includes(k)));
    } else {
      setSelectedEventKeys((prev) => Array.from(new Set([...prev, ...allVisibleKeys])));
    }
  };

  const isAllVisibleSelected = events.length > 0 && events.every((evt) => selectedEventKeys.includes(`${evt.type}-${evt.id}`));

  return (
    <div className="flex flex-col gap-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#1B2B4B]">Upcoming Events</h2>
          <p className="text-xs text-zinc-500 font-semibold">Scheduled income deposits & upcoming bill payments</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Bulk Delete Button */}
          {selectedEventKeys.length > 0 && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isPendingDelete}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600 text-white font-bold text-xs shadow-sm hover:bg-rose-700 transition-all flex items-center justify-center gap-1"
            >
              <span>🗑️</span> Bulk Delete ({selectedEventKeys.length})
            </button>
          )}

          <div className="w-full sm:w-64">
            <SearchInput
              value={upcomingSearch}
              onChange={setUpcomingSearch}
              placeholder="Search upcoming events..."
            />
          </div>

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

      {/* Select All & Select Series Bar */}
      {events.length > 0 && (
        <div className="flex items-center justify-between px-2 text-xs font-semibold text-zinc-500 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <button
              onClick={handleSelectAllVisible}
              className="hover:text-[#00B4A6] transition-all flex items-center gap-1.5"
            >
              <input
                type="checkbox"
                checked={isAllVisibleSelected}
                onChange={() => {}}
                className="w-3.5 h-3.5 rounded border-zinc-300 text-[#00B4A6] focus:ring-[#00B4A6]"
              />
              {isAllVisibleSelected ? "Deselect All" : "Select All"}
            </button>

            {/* Select Series Dropdown right next to Select All */}
            {seriesList.length > 0 && (
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleToggleSeries(e.target.value);
                    e.target.value = "";
                  }
                }}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#00B4A6] text-zinc-700"
                defaultValue=""
              >
                <option value="" disabled>
                  Select Series...
                </option>
                {seriesList.map((s) => {
                  const isSelected = s.eventKeys.every((k) => selectedEventKeys.includes(k));
                  return (
                    <option key={s.key} value={s.key}>
                      {isSelected ? "✓ " : ""}[{s.type}] {s.name} ({s.eventKeys.length})
                    </option>
                  );
                })}
              </select>
            )}
          </div>

          <span>
            {events.filter((evt) => selectedEventKeys.includes(`${evt.type}-${evt.id}`)).length} of {events.length} events selected
          </span>
        </div>
      )}

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
            const sId = evt.seriesId || evt.name;
            const seriesKey = `${evt.type}-${sId}`;

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
                      {/* Select All In Series Button (Recurring only) */}
                      {evt.isRecurring !== false && (
                        <button
                          onClick={() => handleToggleSeries(seriesKey)}
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 transition-all"
                          title="Click to toggle selection for all events in this series"
                        >
                          Series: {evt.seriesName || evt.name}
                        </button>
                      )}
                    </div>
                    <span className="text-xs text-zinc-400">
                      Date: {fmtDate(evt.expectedDate)} • Category: {evt.categoryName} • {evt.note}
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

      {/* Confirmation Modal for Permanent Bulk Delete */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4 border border-zinc-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center text-xl font-bold">
                ⚠️
              </div>
              <div>
                <h3 className="text-lg font-black text-[#1B2B4B]">Permanently Delete Events</h3>
                <p className="text-xs text-zinc-500 font-semibold">Action cannot be undone</p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 leading-relaxed">
              Are you sure you want to permanently delete the <strong className="text-rose-600">{selectedEventKeys.length}</strong> selected event(s)? These records will be permanently removed from your database.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  onBulkDelete();
                }}
                disabled={isPendingDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all shadow-sm disabled:opacity-50"
              >
                {isPendingDelete ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
