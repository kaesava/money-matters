"use client";

import React from "react";
import { fmtDate } from "../utils/formatDate";

export interface FormattedDateProps extends React.HTMLAttributes<HTMLSpanElement> {
  date: string | Date | number | null | undefined;
  fallback?: string;
}

export function FormattedDate({ date, fallback = "—", className, ...props }: FormattedDateProps) {
  if (!date) return <span className={className} {...props}>{fallback}</span>;
  const formatted = fmtDate(date);
  return <span className={className} {...props}>{formatted === "N/A" ? fallback : formatted}</span>;
}
