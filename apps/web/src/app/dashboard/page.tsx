"use client";
import { t } from "@money-matters/i18n";

export default function Dashboard() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">{t("dashboard.title")}</h1>
      <div className="mt-6 p-6 bg-zinc-50 rounded-xl border border-zinc-200">
         <p className="text-zinc-600">{t("dashboard.loading")}</p>
      </div>
    </div>
  );
}
