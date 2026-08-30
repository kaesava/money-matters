"use client";

import { useState, useEffect } from "react";

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
  const [startDate, setStartDate] = useState<string>(initialStartDate || new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState<string | null>(initialEndDate || null);

  // Parse initial rrule if provided
  useEffect(() => {
    if (initialRrule) {
      setIsRecurring(true);
      if (initialRrule.includes("FREQ=WEEKLY")) {
        if (initialRrule.includes("INTERVAL=2")) {
          setFrequency("FORTNIGHTLY");
          setInterval(1); // The "2" is baked into Fortnightly for UI simplicity
        } else {
          setFrequency("WEEKLY");
          const match = initialRrule.match(/INTERVAL=(\d+)/);
          setInterval(match ? parseInt(match[1], 10) : 1);
        }
      } else if (initialRrule.includes("FREQ=MONTHLY")) {
        setFrequency("MONTHLY");
        const match = initialRrule.match(/INTERVAL=(\d+)/);
        setInterval(match ? parseInt(match[1], 10) : 1);
      } else if (initialRrule.includes("FREQ=YEARLY")) {
        setFrequency("ANNUALLY");
        const match = initialRrule.match(/INTERVAL=(\d+)/);
        setInterval(match ? parseInt(match[1], 10) : 1);
      }
    } else {
      setIsRecurring(false);
    }
  }, [initialRrule]);

  // Generate rrule string
  const rruleString = isRecurring ? (() => {
    let freqStr = "FREQ=MONTHLY";
    let intVal = interval;

    if (frequency === "WEEKLY") freqStr = "FREQ=WEEKLY";
    if (frequency === "FORTNIGHTLY") {
      freqStr = "FREQ=WEEKLY";
      intVal = 2; // Override interval for fortnightly
    }
    if (frequency === "ANNUALLY") freqStr = "FREQ=YEARLY";

    let rule = freqStr;
    if (intVal > 1) {
      rule += `;INTERVAL=${intVal}`;
    }
    
    return rule;
  })() : null;

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
