"use client";

import React from "react";
import { evaluatePasswordStrength } from "@money-matters/types";
import { t } from "@money-matters/i18n";

interface PasswordStrengthProps {
  password: string;
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthProps) {
  const strength = evaluatePasswordStrength(password);

  const strengthColor =
    strength.score <= 1
      ? "bg-rose-500"
      : strength.score === 2
      ? "bg-amber-500"
      : strength.score === 3
      ? "bg-blue-500"
      : "bg-emerald-500";

  return (
    <div className="space-y-2 mt-1.5">
      <div className="flex gap-1 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className={`flex-1 transition-all duration-300 ${
              index < strength.score ? strengthColor : "bg-transparent"
            }`}
          />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-500 font-medium">
        <span className={strength.hasMinLength ? "text-emerald-600 font-bold" : ""}>
          {strength.hasMinLength ? "✓" : "•"} {t("auth.passwordReqMinLength")}
        </span>
        <span className={strength.hasLower ? "text-emerald-600 font-bold" : ""}>
          {strength.hasLower ? "✓" : "•"} {t("auth.passwordReqLower")}
        </span>
        <span className={strength.hasUpper ? "text-emerald-600 font-bold" : ""}>
          {strength.hasUpper ? "✓" : "•"} {t("auth.passwordReqUpper")}
        </span>
        <span className={strength.hasNumberOrSpecial ? "text-emerald-600 font-bold" : ""}>
          {strength.hasNumberOrSpecial ? "✓" : "•"} {t("auth.passwordReqNumberOrSymbol")}
        </span>
      </div>
    </div>
  );
}

