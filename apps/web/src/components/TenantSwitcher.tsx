"use client";

import React, { useState } from "react";
import { trpc } from "../lib/trpc";
import { t } from "@money-matters/i18n";

export const TenantSwitcher: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const tenantsQuery = trpc.listUserTenants.useQuery();
  const tenantsList = tenantsQuery.data || [];

  const currentTenant = tenantsList.find((t) => t.isCurrent) || tenantsList[0];
  const currentTenantName = currentTenant?.name || "My Household";

  const handleSwitchTenant = (tenantId: string) => {
    localStorage.setItem("money_matters_active_tenant_id", tenantId);
    document.cookie = `active_tenant_id=${tenantId}; path=/; max-age=31536000`;
    window.location.reload();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-800 transition-colors"
      >
        <span>🏡</span>
        <span>{currentTenantName}</span>
        <span className="text-[10px] text-slate-400">▼</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
          <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
            {t("tenantSwitcher.label")}
          </div>
          {tenantsList.map((tenant) => (
            <button
              key={tenant.id}
              onClick={() => {
                handleSwitchTenant(tenant.id);
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-2 text-xs font-semibold hover:bg-blue-50 flex justify-between items-center ${
                tenant.isCurrent ? "text-blue-900 bg-blue-50/50" : "text-slate-700"
              }`}
            >
              <span>{tenant.name}</span>
              {tenant.isCurrent && <span className="text-emerald-600 font-bold">✓ Active</span>}
            </button>
          ))}
          <div className="border-t border-slate-100 mt-2 pt-2 px-3">
            <button
              onClick={() => alert("Partner invite link: Share your household invite code in settings.")}
              className="text-xs text-blue-600 font-bold hover:underline"
            >
              + Join or Invite Partner
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
