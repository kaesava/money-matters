"use client";

import { t } from "@money-matters/i18n";
import { useIconVisibility } from "@money-matters/ui/web";
import { CategorySummaryItem } from "./EverydayPoolSection";

interface SavingsGoalsSectionProps {
  categories: CategorySummaryItem[];
  onSelectCategory?: (id: string) => void;
  onEditCategory: (cat: CategorySummaryItem) => void;
  onArchiveCategory?: (cat: CategorySummaryItem) => void;
  onOpenCreateModal?: (type?: "REGULAR" | "GOAL" | "EVERYDAY") => void;
  onOpenActivity?: (cat: CategorySummaryItem) => void;
}

function fmt(val: string | number | null | undefined) {
  if (val === null || val === undefined) return "—";
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return "—";
  return `$${num.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function SavingsGoalsSection({
  categories,
  onSelectCategory: _onSelectCategory,
  onEditCategory,
  onArchiveCategory: _onArchiveCategory,
  onOpenCreateModal,
  onOpenActivity,
}: SavingsGoalsSectionProps) {
  const { showIcons } = useIconVisibility();

  return (
    <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-5 bg-gradient-to-r from-blue-50/60 to-white border-b border-zinc-100 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {showIcons && (
            <div className="w-10 h-10 rounded-xl bg-[#2563eb]/10 text-[#2563eb] flex items-center justify-center text-xl font-bold">
              🎯
            </div>
          )}
          <div>
            <h3 className="font-extrabold text-[#1B2B4B] text-base">{t("categories.goalSection")}</h3>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">Total Goal Pools</p>
            <p className="text-xl font-mono font-black text-[#1B2B4B]">{categories.length}</p>
          </div>
          {onOpenCreateModal && (
            <button
              onClick={() => onOpenCreateModal("GOAL")}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#2563eb] text-white hover:bg-blue-700 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              + Add Goal
            </button>
          )}
        </div>
      </div>

      {/* Goal Categories Table */}
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-zinc-100 bg-zinc-50/60 text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">
            <th className="px-6 py-3.5">Goal Name</th>
            <th className="px-6 py-3.5">Current Balance</th>
            <th className="px-6 py-3.5">Target Goal</th>
            <th className="px-6 py-3.5">Target Date</th>
            <th className="px-6 py-3.5">Pacing &amp; Health</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {categories.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-6 py-8 text-center text-xs text-zinc-400 font-medium">
                No savings goals matched filters.
              </td>
            </tr>
          ) : (
            categories.map((cat) => {
              const balanceVal = parseFloat(cat.currentBalance);
              const targetVal = cat.targetAmount ? parseFloat(cat.targetAmount) : 0;
              const pct = targetVal > 0 ? Math.min(100, Math.round((balanceVal / targetVal) * 100)) : 100;
              const healthColor =
                cat.healthStatus === "GREEN" ? "#22C55E" : cat.healthStatus === "AMBER" ? "#F59E0B" : "#EF4444";

              let daysLeftText = null;
              let reqMonthlyText = null;
              if (cat.targetDate) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const tDate = new Date(cat.targetDate);
                tDate.setHours(0, 0, 0, 0);
                const diffDays = Math.ceil((tDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                daysLeftText = diffDays > 0 ? `${diffDays} days left` : diffDays === 0 ? "Due today!" : `${Math.abs(diffDays)} days past due`;

                const monthsLeft = Math.max(1, Math.ceil(diffDays / 30.44));
                const remainingToSave = Math.max(0, targetVal - balanceVal);
                reqMonthlyText = `${fmt(remainingToSave / monthsLeft)}/mo needed`;
              }

              return (
                <tr key={cat.id} className="hover:bg-zinc-50/50 transition-colors text-xs font-semibold">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onEditCategory(cat)}
                        className="text-[#2563eb] hover:underline font-bold text-left flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>{cat.name}</span>
                        {cat.isPrivate && (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            🔒 Private
                          </span>
                        )}
                      </button>
                      {onOpenActivity && (
                        <button
                          type="button"
                          onClick={() => onOpenActivity(cat)}
                          className="px-2 py-0.5 rounded-lg text-[10px] font-bold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                          title="View past transactions and upcoming events for this category"
                        >
                          <span>📊</span>
                          <span>Activity</span>
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono font-extrabold text-[#1B2B4B]">{fmt(balanceVal)}</td>
                  <td className="px-6 py-4 font-mono text-zinc-700">{fmt(cat.targetAmount)}</td>
                  <td className="px-6 py-4 text-zinc-500 font-medium">
                    <div>
                      {cat.targetDate ? cat.targetDate : "—"}
                      {daysLeftText && (
                        <span className="block text-[10px] font-bold text-purple-600 mt-0.5">{daysLeftText}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1.5 w-36">
                      <div className="h-2.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{ width: `${pct}%`, backgroundColor: healthColor }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-extrabold text-zinc-500">
                        <span>
                          {pct}% (
                          {cat.healthStatus === "GREEN"
                            ? "On Track"
                            : cat.healthStatus === "AMBER"
                            ? "Attention"
                            : "Behind"}
                          )
                        </span>
                      </div>
                      {reqMonthlyText && (
                        <span className="text-[10px] font-bold text-zinc-600 bg-zinc-100 px-1.5 py-0.5 rounded w-max">
                          {reqMonthlyText}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
