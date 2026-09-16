/** Ranks a fund against each candidate benchmark and names the closest one. */
import { activeShare } from "./activeShare";
import { matchSecurities } from "./match";
import type { BenchmarkComparison, NormalizedPortfolio } from "./types";

export type BenchmarkCandidate = {
  /** Benchmark ticker, e.g. "IVV". */
  ticker: string;
  /** The benchmark's holdings, already run through `normalizeEquityWeights`. */
  portfolio: NormalizedPortfolio;
};

/**
 * Compares the fund against every candidate, lowest active share first.
 *
 * Ties break on ticker ascending so the same inputs always produce the same
 * table — the page recomputes on every read, and a flapping "closest index"
 * would look like the data changed when only the sort did.
 */
export function rankBenchmarks(
  fund: NormalizedPortfolio,
  candidates: readonly BenchmarkCandidate[],
): BenchmarkComparison[] {
  return candidates
    .map((candidate): BenchmarkComparison => {
      const match = matchSecurities(fund, candidate.portfolio);
      return { ticker: candidate.ticker, activeShare: activeShare(match.rows), match };
    })
    .sort(
      (a, b) =>
        a.activeShare - b.activeShare ||
        (a.ticker < b.ticker ? -1 : a.ticker > b.ticker ? 1 : 0),
    );
}

/**
 * The benchmark the fund resembles most, or null when none was supplied.
 *
 * Picking the *nearest* index is the most charitable reading of the manager's
 * fee: if the effective active fee still looks high against the friendliest
 * benchmark, the conclusion holds against any of them.
 */
export function closestIndex(
  fund: NormalizedPortfolio,
  candidates: readonly BenchmarkCandidate[],
): BenchmarkComparison | null {
  return rankBenchmarks(fund, candidates)[0] ?? null;
}
