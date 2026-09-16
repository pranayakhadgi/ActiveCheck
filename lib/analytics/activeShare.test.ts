import { describe, expect, it } from "vitest";

import { activeShare } from "./activeShare";
import { matchSecurities } from "./match";
import { normalizeEquityWeights } from "./normalize";
import { cash, equities } from "./test-helpers";
import type { PortfolioHolding } from "./types";

/** Runs the whole pipeline the fund page uses: rescale → match → active share. */
function share(fund: PortfolioHolding[], index: PortfolioHolding[]) {
  const match = matchSecurities(normalizeEquityWeights(fund), normalizeEquityWeights(index));
  return { activeShare: activeShare(match.rows), match };
}

// The cases below are docs/research/kimi.md section 3.
describe("activeShare", () => {
  it("identical portfolios → 0", () => {
    expect(share(equities({ AAPL: 60, MSFT: 40 }), equities({ AAPL: 60, MSFT: 40 })).activeShare)
      .toBe(0);
  });

  it("disjoint portfolios → 1", () => {
    expect(share(equities({ AAPL: 100 }), equities({ MSFT: 100 })).activeShare).toBe(1);
  });

  it("single-security overlap at 50% weight → 0.5", () => {
    expect(share(equities({ AAPL: 50, TSLA: 50 }), equities({ AAPL: 100 })).activeShare)
      .toBeCloseTo(0.5, 10);
  });

  it("empty fund holdings → active share 1 with 100% excluded", () => {
    const fund = normalizeEquityWeights([]);
    const result = share([], equities({ AAPL: 100 }));
    expect(result.activeShare).toBe(1);
    expect(fund.excludedPct).toBe(100);
    expect(result.match.unmatchedIndexPct).toBe(100);
  });

  it("excludes non-equity lines before rescaling", () => {
    // fund {AAPL:0.5, CASH:0.3, MSFT:0.2} vs index {AAPL:0.6, MSFT:0.4}
    const holdings = [...equities({ AAPL: 0.5, MSFT: 0.2 }), cash("CASH", 0.3)];
    const result = share(holdings, equities({ AAPL: 0.6, MSFT: 0.4 }));
    expect(result.activeShare).toBeCloseTo(0.114286, 6);
    expect(normalizeEquityWeights(holdings).excludedPct).toBeCloseTo(30, 6);
  });

  it("is symmetric: swapping fund and index gives the same number", () => {
    const fund = equities({ AAPL: 70, MSFT: 20, TSLA: 10 });
    const index = equities({ AAPL: 40, MSFT: 40, NVDA: 20 });
    expect(share(fund, index).activeShare).toBeCloseTo(share(index, fund).activeShare, 12);
  });

  it("stays within [0, 1]", () => {
    const result = share(equities({ A: 1, B: 98, C: 1 }), equities({ B: 1, C: 98, D: 1 }));
    expect(result.activeShare).toBeGreaterThanOrEqual(0);
    expect(result.activeShare).toBeLessThanOrEqual(1);
  });

  it("returns 0 for an empty union rather than NaN", () => {
    expect(activeShare([])).toBe(0);
  });
});
