import { describe, expect, it } from "vitest";

import { normalizeEquityWeights, normalizeName } from "./normalize";
import { cash, equities } from "./test-helpers";

describe("normalizeName", () => {
  it("uppercases, strips punctuation and collapses whitespace", () => {
    expect(normalizeName("  Apple  Inc.  ")).toBe("APPLE");
    expect(normalizeName("ALPHABET INC CL A")).toBe("ALPHABET CL A");
    expect(normalizeName("Alphabet Inc. Class A")).toBe("ALPHABET CL A");
  });

  it("strips trailing legal suffixes but keeps share-class tokens", () => {
    // GOOG and GOOGL are genuinely different securities (docs/research/kimi.md #6),
    // so the class token must survive normalization.
    expect(normalizeName("Alphabet Inc Class C")).not.toBe(normalizeName("Alphabet Inc Class A"));
    expect(normalizeName("Nestle SA")).toBe("NESTLE");
    expect(normalizeName("Royal Dutch Shell PLC")).toBe("ROYAL DUTCH SHELL");
  });

  it("never normalizes a name away to nothing", () => {
    expect(normalizeName("CO")).toBe("CO");
    expect(normalizeName("...")).toBe("...");
  });
});

describe("normalizeEquityWeights", () => {
  it("rescales equity weights to sum to 1", () => {
    const { securities, excludedPct } = normalizeEquityWeights(
      equities({ AAPL: 60, MSFT: 40 }),
    );
    expect(securities.map((s) => s.weight)).toEqual([0.6, 0.4]);
    expect(excludedPct).toBe(0);
  });

  it("excludes non-equity lines and reports the excluded percentage", () => {
    // docs/research/kimi.md section 3: fund {AAPL:0.5, CASH:0.3, MSFT:0.2}
    const { securities, excludedPct } = normalizeEquityWeights([
      ...equities({ AAPL: 0.5, MSFT: 0.2 }),
      cash("CASH", 0.3),
    ]);
    const byName = Object.fromEntries(securities.map((s) => [s.name, s.weight]));
    expect(byName.AAPL).toBeCloseTo(0.714286, 6);
    expect(byName.MSFT).toBeCloseTo(0.285714, 6);
    expect(excludedPct).toBeCloseTo(30, 6);
  });

  it("aggregates slices of one security into a single weight", () => {
    // N-PORT splits a position across lines by country/exchange (kimi.md #1);
    // aggregating before the math is what stops double-counting.
    const { securities } = normalizeEquityWeights([
      { name: "Nestle", cusip: "641069406", isin: null, assetClass: "equity", pctVal: 30 },
      { name: "Nestle SA", cusip: "641069406", isin: null, assetClass: "equity", pctVal: 10 },
      { name: "Apple Inc", cusip: "037833100", isin: null, assetClass: "equity", pctVal: 60 },
    ]);
    expect(securities).toHaveLength(2);
    const nestle = securities.find((s) => s.key === "641069406");
    expect(nestle?.weight).toBeCloseTo(0.4, 10);
    // The display name comes from the largest slice.
    expect(nestle?.name).toBe("Nestle");
  });

  it("falls back from CUSIP to ISIN to normalized name for the identity key", () => {
    const { securities } = normalizeEquityWeights([
      { name: "Apple Inc", cusip: "037833100", isin: "US0378331005", assetClass: "equity", pctVal: 50 },
      { name: "Nokia Oyj", cusip: null, isin: "FI0009000681", assetClass: "equity", pctVal: 30 },
      { name: "Private Co", cusip: null, isin: null, assetClass: "equity", pctVal: 20 },
    ]);
    expect(securities.map((s) => [s.keyKind, s.key])).toEqual([
      ["cusip", "037833100"],
      ["isin", "FI0009000681"],
      ["name", "PRIVATE"],
    ]);
  });

  it("returns no securities and 100% excluded for an empty portfolio", () => {
    expect(normalizeEquityWeights([])).toEqual({ securities: [], excludedPct: 100 });
  });

  it("returns 100% excluded when a portfolio holds no equity at all", () => {
    expect(normalizeEquityWeights([cash("CASH", 100)])).toEqual({
      securities: [],
      excludedPct: 100,
    });
  });

  it("orders securities by descending weight, then by key, deterministically", () => {
    const a = normalizeEquityWeights(equities({ AAA: 10, BBB: 50, CCC: 10, DDD: 30 }));
    const b = normalizeEquityWeights(equities({ DDD: 30, CCC: 10, BBB: 50, AAA: 10 }));
    expect(a.securities.map((s) => s.key)).toEqual(["BBB", "DDD", "AAA", "CCC"]);
    expect(b.securities).toEqual(a.securities);
  });

  it("ignores zero-weight equity lines rather than emitting weightless rows", () => {
    const { securities } = normalizeEquityWeights(equities({ AAPL: 100, GONE: 0 }));
    expect(securities.map((s) => s.key)).toEqual(["AAPL"]);
  });
});
