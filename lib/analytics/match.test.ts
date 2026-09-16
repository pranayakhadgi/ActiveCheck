import { describe, expect, it } from "vitest";

import { matchSecurities } from "./match";
import { normalizeEquityWeights } from "./normalize";
import { equities } from "./test-helpers";
import type { PortfolioHolding } from "./types";

const equity = (
  name: string,
  pctVal: number,
  ids: { cusip?: string | null; isin?: string | null } = {},
): PortfolioHolding => ({
  name,
  cusip: ids.cusip ?? null,
  isin: ids.isin ?? null,
  assetClass: "equity",
  pctVal,
});

const match = (fund: PortfolioHolding[], index: PortfolioHolding[]) =>
  matchSecurities(normalizeEquityWeights(fund), normalizeEquityWeights(index));

describe("matchSecurities", () => {
  it("matches on CUSIP first", () => {
    const result = match(
      [equity("Apple Inc", 100, { cusip: "037833100", isin: "US0378331005" })],
      [equity("APPLE INC", 100, { cusip: "037833100", isin: "US0378331005" })],
    );
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].matchedOn).toBe("cusip");
    expect(result.matchedPct).toBe(100);
  });

  it("falls back to ISIN when only one side files a CUSIP", () => {
    // 148 of 428 Contrafund holdings file "N/A" as the CUSIP but do carry an ISIN.
    const result = match(
      [equity("Nokia Oyj", 100, { cusip: null, isin: "FI0009000681" })],
      [equity("Nokia Corp", 100, { cusip: "654902204", isin: "FI0009000681" })],
    );
    expect(result.rows[0].matchedOn).toBe("isin");
    expect(result.matchedPct).toBe(100);
  });

  it("falls back to the normalized name when no identifier lines up", () => {
    const result = match(
      [equity("Acme Holdings Inc.", 100)],
      [equity("ACME HOLDINGS", 100, { cusip: "999999999" })],
    );
    expect(result.rows[0].matchedOn).toBe("name");
    expect(result.matchedPct).toBe(100);
  });

  it("never lets a name match override a CUSIP match", () => {
    // Both benchmark lines normalize to the same name; only the CUSIP tells
    // them apart, so the CUSIP pass must claim its counterpart first.
    const result = match(
      [equity("Alphabet Inc Class A", 100, { cusip: "02079K305" })],
      [
        equity("Alphabet Inc Class A", 60, { cusip: "02079K305" }),
        equity("Alphabet Inc Class C", 40, { cusip: "02079K107" }),
      ],
    );
    const matched = result.rows.find((r) => r.matchedOn !== null);
    expect(matched?.matchedOn).toBe("cusip");
    expect(matched?.indexWeight).toBeCloseTo(0.6, 10);
    expect(result.unmatchedIndexPct).toBeCloseTo(40, 6);
  });

  it("keeps dual share classes as separate securities", () => {
    const result = match(
      [equity("Alphabet Inc Class A", 100, { cusip: "02079K305" })],
      [equity("Alphabet Inc Class C", 100, { cusip: "02079K107" })],
    );
    expect(result.rows).toHaveLength(2);
    expect(result.matchedPct).toBe(0);
    expect(result.unmatchedFundPct).toBe(100);
    expect(result.unmatchedIndexPct).toBe(100);
  });

  it("matches a benchmark security at most once", () => {
    // Two fund lines that survive aggregation as distinct securities must not
    // both claim the same benchmark row and double-count its weight.
    const result = match(
      [equity("Acme Inc", 50, { cusip: "AAA" }), equity("Acme Inc", 50, { cusip: "BBB" })],
      [equity("Acme Inc", 100, { cusip: "AAA" })],
    );
    const totalIndex = result.rows.reduce((sum, r) => sum + r.indexWeight, 0);
    expect(totalIndex).toBeCloseTo(1, 10);
    expect(result.matchedPct).toBeCloseTo(50, 6);
  });

  it("reports the union when the fund holds nothing", () => {
    const result = match([], equities({ AAPL: 100 }));
    expect(result.rows).toEqual([
      { key: "AAPL", name: "AAPL", fundWeight: 0, indexWeight: 1, matchedOn: null },
    ]);
    expect(result.matchedPct).toBe(0);
    expect(result.unmatchedFundPct).toBe(0);
    expect(result.unmatchedIndexPct).toBe(100);
  });

  it("is deterministic in row order regardless of input order", () => {
    const a = match(equities({ AAA: 30, BBB: 70 }), equities({ BBB: 40, CCC: 60 }));
    const b = match(equities({ BBB: 70, AAA: 30 }), equities({ CCC: 60, BBB: 40 }));
    expect(b.rows).toEqual(a.rows);
    expect(a.rows.map((r) => r.key)).toEqual(["BBB", "CCC", "AAA"]);
  });
});
