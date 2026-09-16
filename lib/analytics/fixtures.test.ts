import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { toPortfolioHoldings } from "@/lib/nport/portfolio";
import { parseNport } from "@/lib/nport/parse";

import { activeShare } from "./activeShare";
import { closestIndex } from "./closestIndex";
import { effectiveActiveFee } from "./effectiveActiveFee";
import { matchSecurities } from "./match";
import { normalizeEquityWeights } from "./normalize";
import { topOverUnderweights } from "./topOverUnderweights";

const FIXTURE_DIR = path.join(process.cwd(), "fixtures", "nport");

function fixture(ticker: string) {
  const filing = parseNport(readFileSync(path.join(FIXTURE_DIR, `${ticker}.xml`), "utf8"));
  return { filing, portfolio: normalizeEquityWeights(toPortfolioHoldings(filing.holdings)) };
}

const pct = (x: number) => `${(x * 100).toFixed(2)}%`;

/**
 * End-to-end over real filings: Fidelity Contrafund against the three iShares
 * S&P 500 index funds. Numbers are printed so they can be sanity-checked by
 * hand against the fund's published profile.
 */
describe("Contrafund vs the iShares S&P 500 benchmarks", () => {
  const fund = fixture("FCNTX");
  const benchmarks = ["IVV", "IVW", "IVE"].map((ticker) => ({
    ticker,
    ...fixture(ticker),
  }));

  const ivv = benchmarks.find((b) => b.ticker === "IVV")!;
  const match = matchSecurities(fund.portfolio, ivv.portfolio);
  const share = activeShare(match.rows);

  it("computes a plausible active share against IVV", () => {
    // Contrafund is a concentrated large-cap growth fund: high, but not disjoint.
    expect(share).toBeGreaterThan(0.5);
    expect(share).toBeLessThan(0.95);
  });

  it("matches most of the fund's equity weight to the benchmark", () => {
    expect(match.matchedPct).toBeGreaterThan(60);
    expect(match.matchedPct + match.unmatchedFundPct).toBeCloseTo(100, 6);
  });

  it("excludes only a small share of the portfolio as non-equity", () => {
    expect(fund.portfolio.excludedPct).toBeLessThan(15);
    expect(ivv.portfolio.excludedPct).toBeLessThan(5);
  });

  it("rescales both sides to weights summing to 1", () => {
    const sum = (ws: { weight: number }[]) => ws.reduce((t, s) => t + s.weight, 0);
    expect(sum(fund.portfolio.securities)).toBeCloseTo(1, 10);
    expect(sum(ivv.portfolio.securities)).toBeCloseTo(1, 10);
  });

  it("prints the full result for a hand check", () => {
    const closest = closestIndex(fund.portfolio, benchmarks)!;
    // Expense ratios as published: FCNTX 0.39%/yr, IVV 0.03%/yr.
    const fee = effectiveActiveFee(0.0039, 0.0003, closest.activeShare);
    const { overweights, underweights } = topOverUnderweights(closest.match.rows, 5);

    const lines = [
      ``,
      `FCNTX (Fidelity Contrafund), data as of ${fund.filing.reportDate}`,
      `  equity positions:  ${fund.portfolio.securities.length}`,
      `  excluded non-equity: ${fund.portfolio.excludedPct.toFixed(2)}%`,
      `  closest index:     ${closest.ticker} (as of ${
        benchmarks.find((b) => b.ticker === closest.ticker)!.filing.reportDate
      })`,
      `  active share:      ${pct(closest.activeShare)}`,
      `  matched weight:    ${closest.match.matchedPct.toFixed(2)}%`,
      `  effective active fee: ${fee === undefined ? "n/a" : `${(fee * 100).toFixed(2)}%/yr`}`,
      `  active share vs each benchmark:`,
      ...benchmarks.map(
        (b) => `    ${b.ticker}: ${pct(activeShare(matchSecurities(fund.portfolio, b.portfolio).rows))}`,
      ),
      `  top overweights:`,
      ...overweights.map(
        (r) => `    ${r.name.padEnd(34).slice(0, 34)} ${pct(r.fundWeight).padStart(7)} vs ${pct(r.indexWeight).padStart(7)}  ${r.difference >= 0 ? "+" : ""}${pct(r.difference)}`,
      ),
      `  top underweights:`,
      ...underweights.map(
        (r) => `    ${r.name.padEnd(34).slice(0, 34)} ${pct(r.fundWeight).padStart(7)} vs ${pct(r.indexWeight).padStart(7)}  ${pct(r.difference)}`,
      ),
      ``,
    ];
    console.log(lines.join("\n"));

    expect(closest.activeShare).toBeLessThanOrEqual(share);
    expect(fee).toBeGreaterThan(0);
  });
});
