const LOCALE = "es-CO";

export const DEFAULT_CURRENCY = "COP";

/**
 * Money, in the currency the row was recorded in.
 *
 * Defaults to Colombian pesos with no decimals, which is what the whole app used
 * before amounts started carrying a currency of their own. Anything else keeps its
 * decimals, because dropping them on a USD amount loses real money.
 */
export function formatMoney(value, currency = DEFAULT_CURRENCY) {
  const parsed = Number(value || 0);
  const code = (currency || DEFAULT_CURRENCY).toUpperCase();
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: code,
    maximumFractionDigits: code === DEFAULT_CURRENCY ? 0 : 2,
  }).format(Number.isFinite(parsed) ? parsed : 0);
}

/** A percentage, or "-" when there is no margin to speak of (no revenue booked). */
export function formatPercent(value) {
  if (value === null || value === undefined || value === "") return "-";
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "-";
  return `${parsed.toFixed(1)}%`;
}

/** A date-only API value ("2026-09-14"), pinned to local midnight so it never shifts a day. */
export function formatDate(value) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(LOCALE);
}

/** A full timestamp that already carries time information. */
export function formatDateOnly(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(LOCALE);
}

/** A full timestamp, with the time shown. */
export function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(LOCALE, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
