import { describe, expect, it } from "vitest";

import { isDayTap } from "./date-picker-dismiss";

const on = (iso: string) => new Date(`${iso}T00:00:00`);

describe("isDayTap", () => {
  it("treats a day tap inside the selected month as a tap", () => {
    expect(isDayTap("2026-08-22", on("2026-08-18"))).toBe(true);
  });

  it("treats a month wheel scroll as not a tap, since the day carries over", () => {
    expect(isDayTap("2026-08-22", on("2026-03-22"))).toBe(false);
  });

  it("treats a year wheel scroll as not a tap", () => {
    expect(isDayTap("2026-08-22", on("2024-08-22"))).toBe(false);
  });

  it("treats a wheel scroll that clamps to a shorter month as not a tap", () => {
    // Aug 31 has no counterpart in February; the wheel lands on the 28th.
    expect(isDayTap("2026-08-31", on("2026-02-28"))).toBe(false);
  });

  // The bug this predicate replaced: the < > chevrons move the grid without
  // moving the selection, so the first tap in the new month arrives from a
  // different month than `previous` and used to be read as a wheel scroll.
  it("treats a tap after chevron-navigating to another month as a tap", () => {
    expect(isDayTap("2026-08-22", on("2026-07-15"))).toBe(true);
  });

  it("treats a tap after chevron-navigating to another year as a tap", () => {
    expect(isDayTap("2026-08-22", on("2024-08-10"))).toBe(true);
  });

  // Documented blind spot: this tap is byte-for-byte what the wheel produces.
  it("cannot recognise a tap on the day the wheel would have carried over", () => {
    expect(isDayTap("2026-08-22", on("2026-07-22"))).toBe(false);
  });
});
