/** Formats a stored period date for `<input type="date">` (local calendar day). */
export function formatRipsPeriodForInput(date: Date): string {
  const value = new Date(date);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Parses `<input type="date">` value as start of local calendar day. */
export function parseRipsPeriodFromInput(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/** Parses `<input type="date">` value as end of local calendar day. */
export function parseRipsPeriodToInput(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day, 23, 59, 59, 999);
}
