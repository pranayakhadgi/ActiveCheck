/**
 * Shared types for `lib/analytics/`.
 *
 * Everything here is data only: the analytics layer never touches the network,
 * the filesystem or the database, so the same shapes serve the loader, the
 * route handlers and the tests.
 */

/**
 * Asset buckets, matching the CHECK constraint on `holdings.asset_cat`.
 * Only `equity` takes part in active share; the rest are excluded and counted
 * in the excluded %.
 */
export type AssetClass = "equity" | "debt" | "derivative" | "cash" | "other";

/** One holding line as it arrives from the parser or from `holdings`. */
export type PortfolioHolding = {
  /** Issuer name as filed; used for display and as the last matching fallback. */
  name: string;
  /** 9-character CUSIP, or null when the filing reports none. */
  cusip?: string | null;
  /** ISIN, or null. */
  isin?: string | null;
  assetClass: AssetClass;
  /** Percent of net assets as reported — a percentage, so a filing sums to ~100. */
  pctVal: number;
};

/** An equity position after slice aggregation and equity-only rescaling. */
export type SecurityWeight = {
  /** Identity key: CUSIP, else ISIN, else normalized name. Unique in a portfolio. */
  key: string;
  /** Which identifier `key` came from — surfaced so match quality is auditable. */
  keyKind: "cusip" | "isin" | "name";
  /** Display name, from the largest slice of the position. */
  name: string;
  cusip: string | null;
  isin: string | null;
  nameNorm: string;
  /** Equity-only rescaled weight, a decimal fraction. Weights sum to 1. */
  weight: number;
};

/** Output of {@link normalizeEquityWeights}. */
export type NormalizedPortfolio = {
  /** Equity positions, weights summing to 1 (empty when there is no equity). */
  securities: SecurityWeight[];
  /** Share of the reported portfolio dropped as non-equity, as a percentage 0–100. */
  excludedPct: number;
};

/** One security in the union of the fund and the benchmark. */
export type MatchedSecurity = {
  key: string;
  name: string;
  /** Fund weight, 0 when only the benchmark holds it. */
  fundWeight: number;
  /** Benchmark weight, 0 when only the fund holds it. */
  indexWeight: number;
  /** Identifier the two sides were matched on; null when only one side holds it. */
  matchedOn: "cusip" | "isin" | "name" | null;
};

/** Output of {@link matchSecurities}. */
export type MatchResult = {
  /** The union of both portfolios, one row per security. */
  rows: MatchedSecurity[];
  /** Fund weight that found a benchmark counterpart, as a percentage 0–100. */
  matchedPct: number;
  /** Fund weight with no benchmark counterpart, as a percentage 0–100. */
  unmatchedFundPct: number;
  /** Benchmark weight the fund does not hold at all, as a percentage 0–100. */
  unmatchedIndexPct: number;
};

/** A fund measured against one benchmark. */
export type BenchmarkComparison = {
  /** Benchmark ticker, e.g. "IVV". Also the deterministic tie-break key. */
  ticker: string;
  activeShare: number;
  match: MatchResult;
};

/** One row of the over/underweight tables on the fund page. */
export type WeightDifference = {
  key: string;
  name: string;
  fundWeight: number;
  indexWeight: number;
  /** fundWeight − indexWeight; positive is an overweight. */
  difference: number;
};
