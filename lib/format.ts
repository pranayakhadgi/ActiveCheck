/**
 * Display formatting. Pure, and shared by every page so one number never
 * appears two ways.
 *
 * DESIGN.md: every number has a label, a unit and a data date, and colour never
 * carries meaning alone — so differences always render with an explicit sign.
 */

/** A decimal fraction as a percentage: 0.5246 → "52.5%". */
export function percent(fraction: number, digits = 1): string {
  return `${(fraction * 100).toFixed(digits)}%`;
}

/** A value already on a 0–100 scale: 3.417 → "3.4%". */
export function percentPoints(points: number, digits = 1): string {
  return `${points.toFixed(digits)}%`;
}

/** A yearly fee as a decimal fraction: 0.00743 → "0.74%/yr". */
export function feePerYear(fraction: number, digits = 2): string {
  return `${(fraction * 100).toFixed(digits)}%/yr`;
}

/**
 * A weight difference, always signed: 0.0123 → "+1.23%", −0.0045 → "-0.45%".
 * The sign is the accessible half of the over/underweight colouring.
 */
export function signedPercent(fraction: number, digits = 2): string {
  const value = fraction * 100;
  // toFixed already writes the minus; only the plus has to be added.
  return `${value > 0 ? "+" : ""}${value.toFixed(digits)}%`;
}

/**
 * An ISO `YYYY-MM-DD` as "30 Jun 2026".
 *
 * Formatted from the string parts, never through `new Date(value)`: report
 * periods are calendar dates, and parsing one as an instant shifts it a day in
 * negative-offset timezones — the same reason DATE columns are read as strings.
 */
export function reportDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  const MONTHS = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const name = MONTHS[Number(month) - 1];
  if (!name || !year || !day) return iso;
  return `${Number(day)} ${name} ${year}`;
}
