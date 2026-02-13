import { formatInTimeZone } from "date-fns-tz";

import { APP_TIME_ZONE } from "./constants";

export function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  if (value && typeof value === "object" && "toString" in value) {
    return Number(String(value));
  }
  return 0;
}

export function formatCurrencyTRY(value: unknown): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

export function formatDateTimeTR(value: Date | string | null | undefined): string {
  if (!value) return "-";
  return formatInTimeZone(new Date(value), APP_TIME_ZONE, "dd.MM.yyyy HH:mm");
}

export function formatTimeTR(value: Date | string | null | undefined): string {
  if (!value) return "-";
  return formatInTimeZone(new Date(value), APP_TIME_ZONE, "HH:mm");
}

export function formatDateTR(value: Date | string | null | undefined): string {
  if (!value) return "-";
  return formatInTimeZone(new Date(value), APP_TIME_ZONE, "dd.MM.yyyy");
}
