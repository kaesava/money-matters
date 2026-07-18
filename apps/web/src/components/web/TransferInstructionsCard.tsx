"use client";
import React from "react";
import { t } from "@money-matters/i18n";

interface TransferInstruction {
  accountName: string;
  amount: number; // in cents
  isOffset: boolean;
}

interface TransferInstructionsCardProps {
  instructions: TransferInstruction[];
}

function fmtDollars(cents: number) {
  return `$${(cents / 100).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Post-confirmation transfer instructions card. Shows where to move money. */
export function TransferInstructionsCard({ instructions }: TransferInstructionsCardProps) {
  if (instructions.length === 0) return null;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        border: "1px solid var(--dash-border)",
        backgroundColor: "var(--dash-surface)",
      }}
    >
      <div
        className="px-4 py-3 flex items-center gap-2"
        style={{ backgroundColor: "rgba(0,180,166,0.06)", borderBottom: "1px solid var(--dash-border)" }}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: "var(--dash-teal)" }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
        <p className="text-sm font-bold" style={{ color: "var(--dash-teal)" }}>
          {t("paychecks.review.transferInstructions")}
        </p>
      </div>
      <div className="divide-y" style={{ borderColor: "var(--dash-border)" }}>
        {instructions.map((instr, i) => (
          <div key={i} className="px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ backgroundColor: "var(--dash-bg)", color: "var(--dash-muted)" }}
              >
                🏦
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--dash-text)" }}>
                  {instr.accountName}
                </p>
                {instr.isOffset && (
                  <p className="text-xs" style={{ color: "var(--dash-muted)" }}>
                    {t("paychecks.review.offsetAccount")}
                  </p>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              {instr.isOffset ? (
                <span className="text-xs px-2 py-1 rounded-lg font-semibold" style={{ color: "var(--dash-muted)", backgroundColor: "var(--dash-bg)" }}>
                  {t("paychecks.review.offsetAccount")}
                </span>
              ) : (
                <p className="text-sm font-bold tabular-nums" style={{ color: "var(--dash-teal)" }}>
                  {fmtDollars(instr.amount)}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
