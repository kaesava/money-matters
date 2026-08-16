"use client";

import { useSubscriptionStatus } from "../hooks/useSubscriptionStatus";
import { t } from "@money-matters/i18n";

export function TrialStatusBadge() {
  const { status, isLoading } = useSubscriptionStatus();

  if (isLoading || !status || status.isSubscribed) {
    return null;
  }

  if (status.isTrialActive) {
    const days = status.daysRemainingInTrial ?? 30;
    const isUrgent = days <= 7;
    return (
      <div
        className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
          isUrgent
            ? "bg-amber-100 text-amber-900 border border-amber-300"
            : "bg-blue-50 text-blue-800 border border-blue-200"
        }`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
        <span>
          {t("subscription.trialActive")} ({days}d left)
        </span>
      </div>
    );
  }

  if (status.isTrialGrace) {
    return (
      <div className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-900 border border-rose-300 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
        <span>{t("subscription.trialGracePeriod")}</span>
      </div>
    );
  }

  if (status.isTrialExpired) {
    return (
      <div className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
        <span>{t("subscription.trialExpired")} — $9.95/mo</span>
      </div>
    );
  }

  if (status.isPastDue) {
    return (
      <div className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        <span>{t("subscription.pastDue")}</span>
      </div>
    );
  }

  return null;
}

export function SidebarTrialNavItem({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const { status, isLoading } = useSubscriptionStatus();

  if (isLoading || !status) return null;

  const days = status.daysRemainingInTrial ?? 60;
  const isUrgent = days <= 7;

  const icon = status.isSubscribed ? "👑" : "✨";

  const label = status.isSubscribed
    ? "Premium Household"
    : status.isTrialExpired
    ? "Trial Expired"
    : status.isTrialGrace
    ? "Grace Period"
    : `Free Trial (${days}d left)`;

  const actionText = status.isSubscribed ? "Active" : "Upgrade";

  const badgeColor = status.isSubscribed
    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30"
    : isUrgent || status.isTrialExpired
    ? "bg-rose-500/20 text-rose-300 border-rose-500/30 hover:bg-rose-500/30"
    : "bg-blue-500/20 text-blue-200 border-blue-400/30 hover:bg-blue-500/30";

  return (
    <a
      href="/subscription/upgrade"
      onClick={() => {
        if (onNavigate) onNavigate();
      }}
      title={collapsed ? `${label} — ${actionText}` : undefined}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 group relative border ${badgeColor} cursor-pointer ${
        collapsed ? "justify-center" : "justify-between"
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm shrink-0">{icon}</span>
        {!collapsed && <span className="truncate text-white font-bold">{label}</span>}
      </div>
      {!collapsed && (
        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/20 text-white shrink-0">
          {actionText}
        </span>
      )}
      {collapsed && (
        <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-zinc-900 text-white text-xs font-semibold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-xl border border-white/10">
          {label} — {actionText}
        </div>
      )}
    </a>
  );
}
