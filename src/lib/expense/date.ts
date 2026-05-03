const MONTHS: Record<string, number> = {
  JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
  JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
};

/**
 * Parses Indian-bank shorthand dates like `12-APR-26`, `12-Apr-2026`,
 * `12/04/26`, or `12-04-2026`. Returns midnight UTC for the parsed day.
 *
 * Bank emails rarely include a timezone — for dedupe we only need day
 * granularity, so anchoring to UTC midnight is fine.
 */
export function parseBankDate(input: string): Date | null {
  const trimmed = input.trim();

  // dd-MMM-yy or dd-MMM-yyyy (HDFC, Axis, Amex use this)
  const monthName = trimmed.match(/^(\d{1,2})[-\s/]([A-Za-z]{3})[-\s/](\d{2}|\d{4})$/);
  if (monthName) {
    const day = Number(monthName[1]);
    const month = MONTHS[monthName[2].toUpperCase()];
    if (month === undefined) return null;
    const year = expandYear(Number(monthName[3]));
    return new Date(Date.UTC(year, month, day));
  }

  // dd-mm-yy or dd/mm/yyyy
  const numeric = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2}|\d{4})$/);
  if (numeric) {
    const day = Number(numeric[1]);
    const month = Number(numeric[2]) - 1;
    const year = expandYear(Number(numeric[3]));
    if (month < 0 || month > 11) return null;
    return new Date(Date.UTC(year, month, day));
  }

  return null;
}

function expandYear(year: number): number {
  if (year >= 100) return year;
  // Two-digit years: assume 2000-2099. Bank statements predating 2000
  // are out of scope here.
  return 2000 + year;
}
