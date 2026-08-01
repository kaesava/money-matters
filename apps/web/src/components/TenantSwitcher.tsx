"use client";

import React, { useState } from "react";
import { trpc } from "../lib/trpc";

export const TenantSwitcher: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const tenantQuery = trpc.getTenant.useQuery();
  const tenantData = tenantQuery.data;

  const currentTenantName = tenantData?.name || "Primary Household";

  const handleSwitchTenant = (tenantId: string) => {
    localStorage.setItem("active_tenant_id", tenantId);
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
            Switch Household / Tenant
          </div>
          <button
            onClick={() => {
              handleSwitchTenant(tenantData?.id || "");
              setIsOpen(false);
            }}
            className="w-full text-left px-4 py-2 text-xs font-semibold hover:bg-blue-50 text-blue-900 flex justify-between items-center"
          >
            <span>{currentTenantName}</span>
            <span className="text-emerald-600 font-bold">✓ Active</span>
          </button>
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
