/**
 * The one worked example on the landing page.
 *
 * The hero's proof element is a real analytical artifact, so it is read through
 * `getFundReport` — the same query the fund page renders from — rather than
 * through numbers typed into the page. When nothing is loaded the module falls
 * back to a clearly labelled illustrative example that names no fund and no
 * ticker, because `docs/brand-and-hero.md` forbids both inventing a ticker and
 * putting a real fund's name beside numbers it did not produce.
 */
import "server-only";

import { effectiveActiveFee } from "@/lib/analytics";
import { getFundReport } from "@/lib/queries";
import { verdict, type VerdictTone } from "@/lib/verdict";

/**
 * T. Rowe Price Blue Chip Growth (TRBCX), chosen because it is the one loaded
 * active fund whose filing shares a report period with its closest index, so
 * the card carries no mismatched-period caveat. If it is missing the page falls
 * back rather than silently picking a fund with a different vintage.
 */
export const HERO_FUND_SERIES_ID = "S000002069";

export type ProofSheet = {
  /** True when the figures are made up; the card then says so in its caption. */
  illustrative: boolean;
  fundName: string;
  fundTicker: string | null;
  indexName: string;
  indexTicker: string | null;
  /** Report period as filed, `YYYY-MM-DD`; null only for the fallback. */
  asOf: string | null;
  /** The benchmark's own period; equal to `asOf` on the happy path. */
  indexAsOf: string | null;
  activeShare: number;
  /** Decimal fractions, as stored: 0.0068 = 68 bps. */
  fundExpenseRatio: number | null;
  indexExpenseRatio: number | null;
  effectiveActiveFee: number | null;
  /** Percentages on a 0–100 scale, as `results` stores them. */
  matchedPct: number;
  excludedPct: number;
  /** False when the fee is computed from a placeholder expense ratio. */
  erVerified: boolean;
  verdictSentence: string;
  verdictTone: VerdictTone;
  /** The fund page this card is a summary of, or null for the fallback. */
  href: string | null;
};

const ILLUSTRATIVE_ACTIVE_SHARE = 0.4;
const ILLUSTRATIVE_FUND_ER = 0.007;
const ILLUSTRATIVE_INDEX_ER = 0.0005;

/**
 * Shown only when no filing is loaded. The figures are round and the fee is
 * computed by the real formula, so the card still demonstrates the arithmetic
 * it is there to explain.
 */
export const ILLUSTRATIVE_PROOF: ProofSheet = {
  illustrative: true,
  fundName: "An actively managed large-cap fund",
  fundTicker: null,
  indexName: "Its closest available index fund",
  indexTicker: null,
  asOf: null,
  indexAsOf: null,
  activeShare: ILLUSTRATIVE_ACTIVE_SHARE,
  fundExpenseRatio: ILLUSTRATIVE_FUND_ER,
  indexExpenseRatio: ILLUSTRATIVE_INDEX_ER,
  effectiveActiveFee:
    effectiveActiveFee(
      ILLUSTRATIVE_FUND_ER,
      ILLUSTRATIVE_INDEX_ER,
      ILLUSTRATIVE_ACTIVE_SHARE,
    ) ?? null,
  matchedPct: 90,
  excludedPct: 2,
  erVerified: false,
  // Written out rather than built by `verdict()`: that sentence names the
  // benchmark's ticker, and this example deliberately has none to name.
  verdictSentence:
    "About 60% of this fund matches its closest index. You pay ~1.63%/yr for the rest.",
  verdictTone: "low",
  href: null,
};

/** The hero card's data: the real fund if it is loaded, else the fallback. */
export async function getHeroProof(): Promise<ProofSheet> {
  const fund = await getFundReport(HERO_FUND_SERIES_ID);
  if (!fund) return ILLUSTRATIVE_PROOF;

  // getFundReport sorts the closest benchmark first; the loader guarantees
  // exactly one exists per filing.
  const closest = fund.benchmarks[0];
  const story = verdict(closest.activeShare, closest.effectiveActiveFee, closest.ticker);

  return {
    illustrative: false,
    fundName: fund.name,
    fundTicker: fund.ticker,
    indexName: closest.name,
    indexTicker: closest.ticker,
    asOf: fund.reportPeriod,
    indexAsOf: closest.reportPeriod,
    activeShare: closest.activeShare,
    fundExpenseRatio: fund.expenseRatio,
    indexExpenseRatio: closest.expenseRatio,
    effectiveActiveFee: closest.effectiveActiveFee,
    matchedPct: closest.matchedPct,
    excludedPct: fund.excludedPct,
    erVerified: fund.erVerified,
    verdictSentence: story.sentence,
    verdictTone: story.tone,
    href: `/fund/${fund.seriesId}`,
  };
}
