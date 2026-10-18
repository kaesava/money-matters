"use client";

import React from "react";
import { HousingType, CarSize, VehicleConfig } from "@money-matters/types";
import { InfoTooltip } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";

interface LifestyleHousingTransportProps {
  housingType: HousingType;
  setHousingType: (val: HousingType) => void;
  hasCars: boolean;
  setHasCars: (val: boolean) => void;
  vehicles: VehicleConfig[];
  onAddVehicle: () => void;
  onUpdateVehicle: <K extends keyof VehicleConfig>(id: string, field: K, value: VehicleConfig[K]) => void;
  onRemoveVehicle: (id: string) => void;
  usePublicTransport: boolean;
  setUsePublicTransport: (val: boolean) => void;
  useRideshare: boolean;
  setUseRideshare: (val: boolean) => void;
}

export function LifestyleHousingTransport({
  housingType,
  setHousingType,
  hasCars,
  setHasCars,
  vehicles,
  onAddVehicle,
  onUpdateVehicle,
  onRemoveVehicle,
  usePublicTransport,
  setUsePublicTransport,
  useRideshare,
  setUseRideshare,
}: LifestyleHousingTransportProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Housing Setup */}
      <div className="flex flex-col gap-2 p-4 bg-slate-50 rounded-2xl border border-zinc-200/60">
        <div className="flex items-center gap-2">
          <label className="text-xs font-black text-[#1B2B4B]">
            {t("setup.lifestyle.housingTitle")}
          </label>
          <InfoTooltip
            title="Housing Type"
            content="Renting solo means covering full lease and utility connections. In a sharehouse, bills and rent are shared."
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
          {[
            { id: "RENT_SOLO", label: "Rent (Solo)" },
            { id: "RENT_SHARE", label: "Sharehouse" },
            { id: "OWN_MORTGAGE", label: "Mortgage" },
            { id: "OWN_OUTRIGHT", label: "Own Outright" },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setHousingType(opt.id as HousingType)}
              className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                housingType === opt.id
                  ? "bg-[#2563eb] text-white border-[#2563eb] shadow-xs"
                  : "bg-white text-[#1B2B4B] border-zinc-200 hover:border-zinc-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Transport & Vehicles */}
      <div className="flex flex-col gap-3 p-4 bg-slate-50 rounded-2xl border border-zinc-200/60">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-[#1B2B4B]">
            {t("setup.lifestyle.vehiclesTitle")}
          </span>
          <InfoTooltip
            title="Vehicle Benchmarks"
            content="Calculates baseline estimates for vehicle maintenance, rego, and fuel based on fleet sizes."
          />
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
            <input
              type="checkbox"
              checked={hasCars}
              onChange={(e) => setHasCars(e.target.checked)}
              className="w-4 h-4 text-[#2563eb] rounded-md"
            />
            {t("setup.lifestyle.ownVehicles")}
          </label>
          <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
            <input
              type="checkbox"
              checked={usePublicTransport}
              onChange={(e) => setUsePublicTransport(e.target.checked)}
              className="w-4 h-4 text-[#2563eb] rounded-md"
            />
            Public Transport
          </label>
          <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
            <input
              type="checkbox"
              checked={useRideshare}
              onChange={(e) => setUseRideshare(e.target.checked)}
              className="w-4 h-4 text-[#2563eb] rounded-md"
            />
            Rideshare / Taxi
          </label>
        </div>

        {hasCars && (
          <div className="flex flex-col gap-3 pt-2">
            {vehicles.map((v, idx) => (
              <div key={v.id} className="p-3 bg-white rounded-xl border border-zinc-200 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1B2B4B]">Vehicle #{idx + 1}</span>
                  {vehicles.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onRemoveVehicle(v.id)}
                      className="text-[11px] font-bold text-red-500 hover:text-red-700 cursor-pointer"
                    >
                      {t("common.remove")}
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={v.name}
                    onChange={(e) => onUpdateVehicle(v.id, "name", e.target.value)}
                    placeholder="Label (e.g. My SUV, Car 1)"
                    className="px-3 py-1.5 text-xs font-bold rounded-lg border border-zinc-200"
                  />
                  <select
                    value={v.size}
                    onChange={(e) => onUpdateVehicle(v.id, "size", e.target.value as CarSize)}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg border border-zinc-200 bg-white"
                  >
                    <option value="SMALL">Small / Hatchback</option>
                    <option value="MID_SUV">Mid-size SUV / Sedan</option>
                    <option value="LUXURY">4WD / Performance</option>
                  </select>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={onAddVehicle}
              className="py-1.5 px-3 bg-white text-zinc-700 text-xs font-bold rounded-lg hover:bg-slate-100 border border-zinc-200 transition-colors cursor-pointer"
            >
              + {t("setup.lifestyle.addVehicle")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
