"use client";

import { useState, useEffect } from "react";
import { fmtDateIso } from "../dates/date-formatting";

import { parseRecurrenceRule, buildRecurrenceRule } from "../dates/recurrence";

export type RecurrenceState = {
  isRecurring: boolean;
  frequency: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "ANNUALLY";
  interval: number;
  startDate: string; // YYYY-MM-DD
  endDate: string | null; // YYYY-MM-DD or null
};

export function useRecurrenceBuilder(initialRrule?: string | null, initialStartDate?: string, initialEndDate?: string | null) {
  const [isRecurring, setIsRecurring] = useState<boolean>(!!initialRrule);
  const [frequency, setFrequency] = useState<"WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "ANNUALLY">("MONTHLY");
  const [interval, setInterval] = useState<number>(1);
  const [startDate, setStartDate] = useState<string>(initialStartDate || fmtDateIso());
  const [endDate, setEndDate] = useState<string | null>(initialEndDate || null);

  // Parse initial rrule if provided
  useEffect(() => {
    if (initialRrule) {
      const parsed = parseRecurrenceRule(initialRrule);
      setIsRecurring(parsed.isRecurring);
      setFrequency(parsed.frequency);
      setInterval(parsed.interval);
    } else {
      setIsRecurring(false);
    }
  }, [initialRrule]);

  // Generate rrule string
  const rruleString = isRecurring ? buildRecurrenceRule(frequency, interval) : null;

  return {
    isRecurring,
    setIsRecurring,
    frequency,
    setFrequency,
    interval,
    setInterval,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    rruleString,
  };
}
