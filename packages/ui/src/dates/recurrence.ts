import { t } from "@money-matters/i18n";
import { fmtDate as defaultFmtDate } from "./date-formatting";

export type RecurrenceFrequency = "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "ANNUALLY";

export interface ParsedRecurrence {
  isRecurring: boolean;
  frequency: RecurrenceFrequency;
  interval: number;
}

export interface ScheduleSummaryOptions {
  rrule?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  envelopeType?: string | null;
  locale?: string;
  timeZone?: string;
}

export function parseRecurrenceRule(
  rrule?: string | null,
  preferredFrequency?: string | null
): ParsedRecurrence {
  if (!rrule || !rrule.trim()) {
    const fallbackFreq =
      preferredFrequency === "WEEKLY" ||
      preferredFrequency === "FORTNIGHTLY" ||
      preferredFrequency === "ANNUALLY"
        ? preferredFrequency
        : "MONTHLY";
    return { isRecurring: false, frequency: fallbackFreq, interval: 1 };
  }

  const match = rrule.match(/INTERVAL=(\d+)/);
  const rawInterval = match ? parseInt(match[1], 10) : 1;

  if (rrule.includes("FREQ=WEEKLY")) {
    if (preferredFrequency === "WEEKLY" && rawInterval === 2) {
      return { isRecurring: true, frequency: "WEEKLY", interval: 2 };
    }
    if (
      preferredFrequency === "FORTNIGHTLY" ||
      rrule.includes("FREQ=WEEKLY;INTERVAL=2") ||
      (rawInterval > 1 && rawInterval % 2 === 0)
    ) {
      return {
        isRecurring: true,
        frequency: "FORTNIGHTLY",
        interval: Math.max(1, Math.floor(rawInterval / 2)),
      };
    }
    return { isRecurring: true, frequency: "WEEKLY", interval: Math.max(1, rawInterval) };
  }

  if (rrule.includes("FREQ=YEARLY") || rrule.includes("FREQ=ANNUALLY")) {
    return { isRecurring: true, frequency: "ANNUALLY", interval: Math.max(1, rawInterval) };
  }

  return { isRecurring: true, frequency: "MONTHLY", interval: Math.max(1, rawInterval) };
}

export function buildRecurrenceRule(
  frequency: RecurrenceFrequency,
  interval: number = 1
): string {
  const intVal = Math.max(1, interval);
  if (frequency === "WEEKLY") {
    return intVal > 1 ? `FREQ=WEEKLY;INTERVAL=${intVal}` : "FREQ=WEEKLY";
  }
  if (frequency === "FORTNIGHTLY") {
    const totalWeeks = intVal * 2;
    return `FREQ=WEEKLY;INTERVAL=${totalWeeks}`;
  }
  if (frequency === "ANNUALLY") {
    return intVal > 1 ? `FREQ=YEARLY;INTERVAL=${intVal}` : "FREQ=YEARLY";
  }
  return intVal > 1 ? `FREQ=MONTHLY;INTERVAL=${intVal}` : "FREQ=MONTHLY";
}

export function formatScheduleSummary(
  options: ScheduleSummaryOptions,
  dateFormatter?: (d: string | Date | number | null | undefined) => string
): string {
  const { rrule, startDate, endDate, envelopeType } = options;
  if (envelopeType === "FLEXIBLE_BILL") {
    return t("categories.billModeFlexible");
  }

  const fmt = dateFormatter || defaultFmtDate;
  const isRecurring = Boolean(rrule && rrule.trim().length > 0);

  let formattedStart: string | null = null;
  if (startDate) {
    const res = fmt(startDate);
    formattedStart = res === "N/A" ? startDate : res;
  }

  let formattedEnd: string | null = null;
  if (endDate) {
    const res = fmt(endDate);
    formattedEnd = res === "N/A" ? endDate : res;
  }

  if (!isRecurring) {
    if (formattedStart && formattedEnd) {
      return `${t("forms.oneOff")} from ${formattedStart} to ${formattedEnd}`;
    }
    if (formattedStart) {
      return `${t("forms.oneOff")} on ${formattedStart}`;
    }
    return t("forms.oneOff");
  }

  const { frequency, interval } = parseRecurrenceRule(rrule);

  let freqStr = "Recurring";
  if (frequency === "WEEKLY") {
    freqStr = interval > 1 ? `every ${interval} weeks` : "weekly";
  } else if (frequency === "FORTNIGHTLY") {
    freqStr = interval > 1 ? `every ${interval * 2} weeks` : "every 2 weeks";
  } else if (frequency === "MONTHLY") {
    freqStr = interval > 1 ? `every ${interval} months` : "monthly";
  } else if (frequency === "ANNUALLY") {
    freqStr = interval > 1 ? `every ${interval} years` : "yearly";
  }

  if (formattedStart && formattedEnd) {
    return `${freqStr} from ${formattedStart} to ${formattedEnd}`;
  }
  if (formattedStart) {
    return `${freqStr} from ${formattedStart}`;
  }
  return freqStr;
}
