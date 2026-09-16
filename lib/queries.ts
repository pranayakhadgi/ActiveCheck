/**
 * Every read the pages make, in one place.
 *
 * The numbers here were computed by `npm run load` and stored, so a page render
 * is a handful of indexed selects rather than a recompute over ~1,900 holdings.
 * `lib/analytics/` stays the only place the maths lives; this module only
 * fetches what it produced, and converts Postgres NUMERIC strings to numbers at
 * exactly one boundary.
 */
import "server-only";

import { sql } from "@/lib/db";

/** Postgres returns NUMERIC as a string to protect precision; convert once, here. */
function num(value: string | null): number | null {
  return value === null ? null : Number(value);
}

export type FundListItem = {
  seriesId: string;
  ticker: string | null;
  name: string;
  isIndex: boolean;
  /** Null when the fund has no filing loaded yet. */
  reportPeriod: string | null;
  /** Active share against the closest index, 0–1. Null when uncomputed. */
  activeShare: number | null;
  closestIndexTicker: string | null;
};

/** Every fund with a filing, for the home page list and its search box. */
export async function listFunds(): Promise<FundListItem[]> {
  const rows = await sql<
    {
      series_id: string;
      ticker: string | null;
      name: string;
      is_index: boolean;
      report_period: string | null;
      active_share: string | null;
      closest_ticker: string | null;
    }[]
  >`
    SELECT f.series_id,
           f.ticker,
           f.name,
           f.is_index,
           latest.report_period,
           r.active_share,
           bench.ticker AS closest_ticker
    FROM funds f
    -- One filing per fund: the most recent report period it has on file.
    LEFT JOIN LATERAL (
      SELECT id, report_period
      FROM filings
      WHERE fund_id = f.id
      ORDER BY report_period DESC
      LIMIT 1
    ) latest ON TRUE
    LEFT JOIN results r ON r.filing_id = latest.id AND r.is_closest
    LEFT JOIN filings bf ON bf.id = r.benchmark_filing_id
    LEFT JOIN funds bench ON bench.id = bf.fund_id
    ORDER BY f.is_index, f.name
  `;

  return rows.map((row) => ({
    seriesId: row.series_id,
    ticker: row.ticker,
    name: row.name,
    isIndex: row.is_index,
    reportPeriod: row.report_period,
    activeShare: num(row.active_share),
    closestIndexTicker: row.closest_ticker,
  }));
}

export type WeightRow = {
  matchKey: string;
  name: string;
  /** Equity-only rescaled weights, decimal fractions. */
  fundWeight: number;
  indexWeight: number;
  /** fundWeight − indexWeight; positive is an overweight. */
  difference: number;
};

export type BenchmarkRow = {
  ticker: string;
  name: string;
  /** The benchmark's own report period — not necessarily the fund's. */
  reportPeriod: string;
  expenseRatio: number | null;
  activeShare: number;
  effectiveActiveFee: number | null;
  matchedPct: number;
  unmatchedFundPct: number;
  unmatchedIndexPct: number;
  benchmarkExcludedPct: number;
  isClosest: boolean;
  overweights: WeightRow[];
  underweights: WeightRow[];
};

export type FundReport = {
  seriesId: string;
  ticker: string | null;
  name: string;
  cik: string;
  isIndex: boolean;
  expenseRatio: number | null;
  erAsOf: string | null;
  erVerified: boolean;
  erSource: string | null;
  /** The filing every number on the page describes. */
  reportPeriod: string;
  accessionNo: string;
  filedAt: string | null;
  sourceUrl: string | null;
  /** Non-equity share of the fund's filing, as a percentage 0–100. */
  excludedPct: number;
  /** Every benchmark, closest first. */
  benchmarks: BenchmarkRow[];
};

/**
 * Everything the fund page renders, for the fund's most recent filing.
 *
 * Returns null when the series is unknown, has no filing, or has no stored
 * comparison — all three mean the same thing to the page: there is nothing
 * honest to show, so it 404s rather than rendering empty tiles.
 */
export async function getFundReport(seriesId: string): Promise<FundReport | null> {
  const [fund] = await sql<
    {
      id: number;
      series_id: string;
      ticker: string | null;
      name: string;
      cik: string;
      is_index: boolean;
      expense_ratio: string | null;
      er_as_of: string | null;
      er_verified: boolean;
      er_source: string | null;
      filing_id: number;
      report_period: string;
      accession_no: string;
      filed_at: string | null;
      source_url: string | null;
    }[]
  >`
    SELECT f.id, f.series_id, f.ticker, f.name, f.cik, f.is_index,
           f.expense_ratio, f.er_as_of, f.er_verified, f.er_source,
           latest.id AS filing_id, latest.report_period, latest.accession_no,
           latest.filed_at, latest.source_url
    FROM funds f
    JOIN LATERAL (
      SELECT id, report_period, accession_no, filed_at, source_url
      FROM filings
      WHERE fund_id = f.id
      ORDER BY report_period DESC
      LIMIT 1
    ) latest ON TRUE
    WHERE f.series_id = ${seriesId}
  `;
  if (!fund) return null;

  const comparisons = await sql<
    {
      result_id: number;
      ticker: string;
      name: string;
      report_period: string;
      expense_ratio: string | null;
      active_share: string;
      effective_active_fee: string | null;
      matched_pct: string;
      unmatched_fund_pct: string;
      unmatched_index_pct: string;
      excluded_pct: string;
      benchmark_excluded_pct: string;
      is_closest: boolean;
    }[]
  >`
    SELECT r.id AS result_id,
           bench.ticker, bench.name, bench.expense_ratio,
           bf.report_period,
           r.active_share, r.effective_active_fee,
           r.matched_pct, r.unmatched_fund_pct, r.unmatched_index_pct,
           r.excluded_pct, r.benchmark_excluded_pct, r.is_closest
    FROM results r
    JOIN filings bf ON bf.id = r.benchmark_filing_id
    JOIN funds bench ON bench.id = bf.fund_id
    WHERE r.filing_id = ${fund.filing_id}
    -- Closest index first, then by how close; ticker breaks ties so the
    -- comparison table never reshuffles between renders.
    ORDER BY r.is_closest DESC, r.active_share, bench.ticker
  `;
  if (!comparisons.length) return null;

  const weights = await sql<
    {
      result_id: number;
      side: "overweight" | "underweight";
      match_key: string;
      name: string;
      fund_weight: string;
      index_weight: string;
      difference: string;
    }[]
  >`
    SELECT w.result_id, w.side, w.match_key, w.name,
           w.fund_weight, w.index_weight, w.difference
    FROM result_weights w
    WHERE w.result_id IN ${sql(comparisons.map((row) => row.result_id))}
    ORDER BY w.result_id, w.side, w.rank
  `;

  const pick = (resultId: number, side: "overweight" | "underweight"): WeightRow[] =>
    weights
      .filter((row) => row.result_id === resultId && row.side === side)
      .map((row) => ({
        matchKey: row.match_key,
        name: row.name,
        fundWeight: Number(row.fund_weight),
        indexWeight: Number(row.index_weight),
        difference: Number(row.difference),
      }));

  return {
    seriesId: fund.series_id,
    ticker: fund.ticker,
    name: fund.name,
    cik: fund.cik,
    isIndex: fund.is_index,
    expenseRatio: num(fund.expense_ratio),
    erAsOf: fund.er_as_of,
    erVerified: fund.er_verified,
    erSource: fund.er_source,
    reportPeriod: fund.report_period,
    accessionNo: fund.accession_no,
    filedAt: fund.filed_at,
    sourceUrl: fund.source_url,
    // Identical on every row of `results` for this filing: it describes the
    // fund's own filing, not the comparison.
    excludedPct: Number(comparisons[0].excluded_pct),
    benchmarks: comparisons.map((row) => ({
      ticker: row.ticker,
      name: row.name,
      reportPeriod: row.report_period,
      expenseRatio: num(row.expense_ratio),
      activeShare: Number(row.active_share),
      effectiveActiveFee: num(row.effective_active_fee),
      matchedPct: Number(row.matched_pct),
      unmatchedFundPct: Number(row.unmatched_fund_pct),
      unmatchedIndexPct: Number(row.unmatched_index_pct),
      benchmarkExcludedPct: Number(row.benchmark_excluded_pct),
      isClosest: row.is_closest,
      overweights: pick(row.result_id, "overweight"),
      underweights: pick(row.result_id, "underweight"),
    })),
  };
}

/** Series IDs with a loaded filing, for `generateStaticParams`. */
export async function listFundSeriesIds(): Promise<string[]> {
  const rows = await sql<{ series_id: string }[]>`
    SELECT DISTINCT f.series_id
    FROM funds f
    JOIN filings fi ON fi.fund_id = f.id
    ORDER BY f.series_id
  `;
  return rows.map((row) => row.series_id);
}
