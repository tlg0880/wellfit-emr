/**
 * Normalizes RIPS export period bounds to full calendar days.
 * periodFrom: start of day (UTC); periodTo: end of day (UTC).
 */
export function startOfRipsPeriodDay(date: Date): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      0,
      0,
      0,
      0
    )
  );
}

export function endOfRipsPeriodDay(date: Date): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      23,
      59,
      59,
      999
    )
  );
}

export function normalizeRipsPeriodBounds(
  periodFrom: Date,
  periodTo: Date
): { periodFrom: Date; periodTo: Date } {
  const from = startOfRipsPeriodDay(periodFrom);
  const to = endOfRipsPeriodDay(periodTo);
  if (to.getTime() < from.getTime()) {
    return { periodFrom: from, periodTo: endOfRipsPeriodDay(periodFrom) };
  }
  return { periodFrom: from, periodTo: to };
}
