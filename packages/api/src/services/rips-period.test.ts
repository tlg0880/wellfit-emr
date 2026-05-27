import { describe, expect, test } from "bun:test";

import {
  endOfRipsPeriodDay,
  normalizeRipsPeriodBounds,
  startOfRipsPeriodDay,
} from "./rips-period";

describe("rips-period", () => {
  test("startOfRipsPeriodDay uses UTC midnight", () => {
    const input = new Date("2026-05-25T15:30:00.000Z");
    const result = startOfRipsPeriodDay(input);
    expect(result.toISOString()).toBe("2026-05-25T00:00:00.000Z");
  });

  test("endOfRipsPeriodDay uses UTC end of day", () => {
    const input = new Date("2026-05-25T04:00:00.000Z");
    const result = endOfRipsPeriodDay(input);
    expect(result.toISOString()).toBe("2026-05-25T23:59:59.999Z");
  });

  test("normalizeRipsPeriodBounds includes encounters on last calendar day", () => {
    const periodFrom = new Date("2026-05-23T00:00:00.000Z");
    const periodTo = new Date("2026-05-25T00:00:00.000Z");
    const { periodTo: normalizedTo } = normalizeRipsPeriodBounds(
      periodFrom,
      periodTo
    );
    const encounterOnLastDay = new Date("2026-05-25T17:30:00.000Z");
    expect(encounterOnLastDay.getTime()).toBeLessThanOrEqual(
      normalizedTo.getTime()
    );
  });

  test("normalizeRipsPeriodBounds clamps inverted ranges", () => {
    const periodFrom = new Date("2026-05-26T00:00:00.000Z");
    const periodTo = new Date("2026-05-23T00:00:00.000Z");
    const normalized = normalizeRipsPeriodBounds(periodFrom, periodTo);
    expect(normalized.periodFrom.toISOString()).toBe(
      "2026-05-26T00:00:00.000Z"
    );
    expect(normalized.periodTo.toISOString()).toBe(
      "2026-05-26T23:59:59.999Z"
    );
  });
});
