import { describe, expect, it } from "vitest";

import { matchSecurities } from "./match";
import { normalizeEquityWeights } from "./normalize";
import { equities } from "./test-helpers";
import { topOverUnderweights } from "./topOverUnderweights";

const compare = (fund: Record<string, number>, index: Record<string, number>) =>
  matchSecurities(normalizeEquityWeights(equities(fund)), normalizeEquityWeights(equities(index)));

describe("topOverUnderweights", () => {
  it("splits the union into the biggest overweights and underweights", () => {
    const { overweights, underweights } = topOverUnderweights(
      compare({ AAPL: 50, MSFT: 30, TSLA: 20 }, { AAPL: 20, MSFT: 30, NVDA: 50 }).rows,
    );
    expect(overweights.map((r) => r.key)).toEqual(["AAPL", "TSLA"]);
    expect(overweights[0].difference).toBeCloseTo(0.3, 10);
    expect(underweights.map((r) => r.key)).toEqual(["NVDA"]);
    expect(underweights[0].difference).toBeCloseTo(-0.5, 10);
  });

  it("omits securities held at the same weight on both sides", () => {
    const { overweights, underweights } = topOverUnderweights(
      compare({ AAPL: 50, MSFT: 50 }, { AAPL: 50, MSFT: 50 }).rows,
    );
    expect(overweights).toEqual([]);
    expect(underweights).toEqual([]);
  });

  it("returns at most `limit` rows per side, defaulting to 10", () => {
    const fund = Object.fromEntries(
      Array.from({ length: 30 }, (_, i) => [`F${String(i).padStart(2, "0")}`, i + 1]),
    );
    const index = Object.fromEntries(
      Array.from({ length: 30 }, (_, i) => [`I${String(i).padStart(2, "0")}`, i + 1]),
    );
    const all = topOverUnderweights(compare(fund, index).rows);
    expect(all.overweights).toHaveLength(10);
    expect(all.underweights).toHaveLength(10);
    expect(topOverUnderweights(compare(fund, index).rows, 3).overweights).toHaveLength(3);
  });

  it("breaks ties by key so the tables are stable across recomputes", () => {
    const { overweights } = topOverUnderweights(
      compare({ BBB: 50, AAA: 50 }, { CCC: 100 }).rows,
    );
    expect(overweights.map((r) => r.key)).toEqual(["AAA", "BBB"]);
  });
});
