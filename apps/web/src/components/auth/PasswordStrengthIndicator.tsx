"use client";

import React from "react";

interface PasswordStrengthProps {
  password: string;
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthProps) {
  const hasMinLength = password.length >= 8;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumberOrSpecial = /[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);

  const passedCount = [hasMinLength, hasLower, hasUpper, hasNumberOrSpecial].filter(Boolean).length;

  const strengthColor =
    passedCount <= 1
      ? "bg-rose-500"
      : passedCount === 2
      ? "bg-amber-500"
      : passedCount === 3
      ? "bg-blue-500"
      : "bg-emerald-500";

  return (
    <div className="space-y-2 mt-1.5">
      <div className="flex gap-1 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className={`flex-1 transition-all duration-300 ${
              index < passedCount ? strengthColor : "bg-transparent"
            }`}
          />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-500 font-medium">
        <span className={hasMinLength ? "text-emerald-600 font-bold" : ""}>
          {hasMinLength ? "✓" : "•"} 8+ characters
        </span>
        <span className={hasLower ? "text-emerald-600 font-bold" : ""}>
          {hasLower ? "✓" : "•"} Lowercase letter
        </span>
        <span className={hasUpper ? "text-emerald-600 font-bold" : ""}>
          {hasUpper ? "✓" : "•"} Uppercase letter
        </span>
        <span className={hasNumberOrSpecial ? "text-emerald-600 font-bold" : ""}>
          {hasNumberOrSpecial ? "✓" : "•"} Number or symbol
        </span>
      </div>
    </div>
  );
}
