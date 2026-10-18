"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Compass,
  ArrowLeft,
  LayoutDashboard,
  CalendarDays,
  FolderLock,
  History,
} from "lucide-react";
import { t } from "@money-matters/i18n";
import { Button } from "@money-matters/ui/web";

interface QuickLinkItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export default function DashboardNotFound() {
  const router = useRouter();

  const quickLinks: QuickLinkItem[] = [
    {
      href: "/dashboard",
      label: t("notFound.quickLinkOverview"),
      icon: LayoutDashboard,
    },
    {
      href: "/dashboard/income-and-bills",
      label: t("notFound.quickLinkIncomeBills"),
      icon: CalendarDays,
    },
    {
      href: "/dashboard/envelopes",
      label: t("notFound.quickLinkEnvelopes"),
      icon: FolderLock,
    },
    {
      href: "/dashboard/history",
      label: t("notFound.quickLinkHistory"),
      icon: History,
    },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-2xl mx-auto min-h-[60vh]">
      <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#2563eb] flex items-center justify-center mb-6 shadow-sm border border-blue-100">
        <Compass className="w-8 h-8 animate-pulse" />
      </div>

      <span className="text-xs font-bold uppercase tracking-widest text-[#2563eb] mb-2 font-mono">
        404
      </span>

      <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1B2B4B] mb-3">
        {t("notFound.inAppTitle")}
      </h1>

      <p className="text-slate-600 text-sm sm:text-base mb-8 max-w-md">
        {t("notFound.inAppSubtitle")}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3 mb-10 w-full sm:w-auto">
        <Button
          variant="secondary"
          size="md"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("notFound.goBack")}
        </Button>
        <Link href="/dashboard">
          <Button variant="primary" size="md">
            {t("notFound.backToDashboard")}
          </Button>
        </Link>
      </div>

      <div className="w-full pt-8 border-t border-slate-200">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
          {t("notFound.quickLinksTitle")}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:border-[#2563eb] hover:bg-blue-50/50 transition-all text-sm font-semibold text-[#1B2B4B] group"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-blue-100 group-hover:text-[#2563eb] flex items-center justify-center text-slate-600 transition-colors">
                  <Icon className="w-4 h-4" />
                </div>
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
