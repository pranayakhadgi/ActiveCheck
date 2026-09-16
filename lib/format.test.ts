import { describe, expect, test } from "vitest";

import { feePerYear, percent, percentPoints, reportDate, signedPercent } from "./format";

describe("percent", () => {
  test("renders a decimal fraction as a percentage", () => {
    expect(percent(0.5246)).toBe("52.5%");
    expect(percent(0.5246, 0)).toBe("52%");
  });
});

describe("percentPoints", () => {
  test("leaves a value already on a 0–100 scale alone", () => {
    // matchedPct and excludedPct arrive as percentages, not fractions.
    expect(percentPoints(3.417)).toBe("3.4%");
  });
});

describe("feePerYear", () => {
  test("carries its unit", () => {
    expect(feePerYear(0.00743)).toBe("0.74%/yr");
  });
});

describe("signedPercent", () => {
  test("always shows a sign, so colour is never the only signal", () => {
    expect(signedPercent(0.0123)).toBe("+1.23%");
    expect(signedPercent(-0.0045)).toBe("-0.45%");
  });
});

describe("reportDate", () => {
  test("formats a calendar date without going through Date parsing", () => {
    expect(reportDate("2026-06-30")).toBe("30 Jun 2026");
  });

  test("does not shift a day in a negative-offset timezone", () => {
    // new Date("2026-01-01") is midnight UTC, which is 31 Dec in US timezones —
    // the whole reason report periods stay strings end to end.
    expect(reportDate("2026-01-01")).toBe("1 Jan 2026");
  });

  test("passes an unparseable value through rather than inventing a date", () => {
    expect(reportDate("not-a-date")).toBe("not-a-date");
  });
});
