import { describe, expect, it } from "vitest";

import { closestIndex, rankBenchmarks } from "./closestIndex";
import { normalizeEquityWeights } from "./normalize";
import { equities } from "./test-helpers";
import type { PortfolioHolding } from "./types";

const portfolio = (weights: Record<string, number>) =>
  normalizeEquityWeights(equities(weights));

const candidate = (ticker: string, weights: Record<string, number>) => ({
  ticker,
  portfolio: portfolio(weights),
});

const holdings = (weights: Record<string, number>): PortfolioHolding[] => equities(weights);

// The cases below are docs/research/kimi.md section 3.
describe("closestIndex", () => {
  it("picks the index with the minimum active share among candidates", () => {
    const fund = portfolio({ AAPL: 70, MSFT: 30 });
    const result = closestIndex(fund, [
      candidate("idx2", { AAPL: 100 }), // AS = 0.3
      candidate("idx1", { AAPL: 50, MSFT: 50 }), // AS = 0.2
    ]);
    expect(result?.ticker).toBe("idx1");
    expect(result?.activeShare).toBeCloseTo(0.2, 10);
  });

  it("breaks ties deterministically by ascending ticker", () => {
    const fund = portfolio({ AAPL: 50, MSFT: 50 });
    const result = closestIndex(fund, [
      candidate("ZZZ", { AAPL: 100 }),
      candidate("AAA", { MSFT: 100 }),
    ]);
    // Both are 0.5 away; the lexicographically smaller ticker wins.
    expect(result?.activeShare).toBeCloseTo(0.5, 10);
    expect(result?.ticker).toBe("AAA");
  });

  it("never lets a fully disjoint index beat a partially overlapping one", () => {
    const fund = portfolio({ AAPL: 80, MSFT: 20 });
    const result = closestIndex(fund, [
      candidate("disjoint", { NVDA: 100 }), // AS = 1
      candidate("partial", { AAPL: 40, MSFT: 60 }), // AS = 0.4
    ]);
    expect(result?.ticker).toBe("partial");
  });

  it("returns null when there are no candidates", () => {
    expect(closestIndex(portfolio({ AAPL: 100 }), [])).toBeNull();
  });
});

describe("rankBenchmarks", () => {
  it("returns every candidate sorted by active share, then ticker", () => {
    const fund = portfolio({ AAPL: 70, MSFT: 30 });
    const ranked = rankBenchmarks(fund, [
      candidate("idx2", { AAPL: 100 }),
      candidate("idx3", { NVDA: 100 }),
      candidate("idx1", { AAPL: 50, MSFT: 50 }),
    ]);
    expect(ranked.map((r) => r.ticker)).toEqual(["idx1", "idx2", "idx3"]);
    // The comparison table on the fund page needs the match detail per benchmark.
    expect(ranked[0].match.matchedPct).toBeCloseTo(100, 6);
  });

  it("does not mutate the candidate list it was given", () => {
    const candidates = [candidate("b", { AAPL: 100 }), candidate("a", { MSFT: 100 })];
    const order = candidates.map((c) => c.ticker);
    rankBenchmarks(portfolio({ AAPL: 100 }), candidates);
    expect(candidates.map((c) => c.ticker)).toEqual(order);
  });

  it("accepts raw holdings through normalizeEquityWeights", () => {
    // Guards the intended call order: benchmarks are rescaled the same way funds are.
    const fund = normalizeEquityWeights(holdings({ AAPL: 100 }));
    expect(rankBenchmarks(fund, [candidate("idx", { AAPL: 100 })])[0].activeShare).toBe(0);
  });
});
