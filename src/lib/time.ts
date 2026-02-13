import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

import { APP_TIME_ZONE } from "./constants";

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function getTodayTR(): string {
  return formatInTimeZone(new Date(), APP_TIME_ZONE, "yyyy-MM-dd");
}

export function normalizeDayInput(day?: string | null): string {
  if (day && DAY_PATTERN.test(day)) {
    return day;
  }
  return getTodayTR();
}

export function getDayRangeUtc(day?: string | null): { day: string; startUtc: Date; endUtc: Date } {
  const normalized = normalizeDayInput(day);
  const startUtc = fromZonedTime(`${normalized}T00:00:00`, APP_TIME_ZONE);
  const endUtc = fromZonedTime(`${normalized}T23:59:59.999`, APP_TIME_ZONE);

  return {
    day: normalized,
    startUtc,
    endUtc,
  };
}

export function getRangeUtc(startDay?: string | null, endDay?: string | null): {
  startDay: string;
  endDay: string;
  startUtc: Date;
  endUtc: Date;
} {
  const normalizedStart = normalizeDayInput(startDay);
  const normalizedEnd = normalizeDayInput(endDay ?? normalizedStart);

  const startUtc = fromZonedTime(`${normalizedStart}T00:00:00`, APP_TIME_ZONE);
  const endUtc = fromZonedTime(`${normalizedEnd}T23:59:59.999`, APP_TIME_ZONE);

  return {
    startDay: normalizedStart,
    endDay: normalizedEnd,
    startUtc,
    endUtc,
  };
}

export function getTrDateKey(date: Date = new Date()): string {
  return formatInTimeZone(date, APP_TIME_ZONE, "yyyyMMdd");
}
