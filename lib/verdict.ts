/**
 * The plain-English sentence on the fund page, and the labelling convention
 * behind its colour.
 *
 * Pure and deterministic, so the wording is unit-tested rather than reviewed by
 * eye. It lives outside `lib/analytics/` because it is presentation: analytics
 * produces the numbers, this decides how to say them.
 */
import { UNRELIABLE_ACTIVE_SHARE } from "@/lib/analytics";
import { feePerYear, percent } from "@/lib/format";

/**
 * Below this active share a fund is conventionally called a closet indexer.
 *
 * Cremers & Petajisto describe 20–60% as the low-active-share range, and the
 * 60% line is the cutoff later studies attribute to them
 * (docs/research/perplexity.md §6). It is a labelling convention, not a claim
 * that 59.9% and 60.1% are economically different funds, so it only ever
 * changes a word and a colour — never a number.
 */
export const CLOSET_INDEXER_ACTIVE_SHARE = 0.6;

export type VerdictTone = "low" | "high";

export type Verdict = {
  /** "low" = closet indexer (amber), "high" = genuinely active (green). */
  tone: VerdictTone;
  /** Two-word label for the gauge, e.g. "Closet indexer". */
  label: string;
  /** The sentence under the stat row. */
  sentence: string;
  /** Set when active share is too small for the fee to be read at face value. */
  caveat: string | null;
};

/**
 * Builds the verdict for a fund measured against its closest index.
 *
 * `fee` is the effective active fee as a decimal fraction, or null when it is
 * undefined — no expense ratio on one side, or no active share to divide by.
 */
export function verdict(
  activeShare: number,
  fee: number | null,
  closestIndexTicker: string,
): Verdict {
  const tone: VerdictTone = activeShare < CLOSET_INDEXER_ACTIVE_SHARE ? "low" : "high";
  const label = tone === "low" ? "Closet indexer" : "Genuinely active";
  const matches = percent(1 - activeShare, 0);

  const opening = `About ${matches} of this fund matches ${closestIndexTicker}, its closest index.`;

  // No fee to quote: say what is missing rather than printing a blank tile.
  if (fee === null) {
    return {
      tone,
      label,
      sentence: `${opening} There is no expense ratio on file for both sides, so the price of the rest cannot be worked out.`,
      caveat: null,
    };
  }

  // A negative fee is meaningful and is never clamped: the fund is cheaper than
  // the index fund it resembles, so the active part costs nothing at all.
  const closing =
    fee < 0
      ? `The rest costs you nothing — this fund is ${feePerYear(Math.abs(fee))} cheaper than ${closestIndexTicker}.`
      : `You pay ~${feePerYear(fee)} for the rest.`;

  return {
    tone,
    label,
    sentence: `${opening} ${closing}`,
    caveat:
      activeShare < UNRELIABLE_ACTIVE_SHARE
        ? `Only ${percent(activeShare, 0)} of this fund is active, so the whole fee gap is being divided by a sliver of the portfolio. Read the effective active fee as a direction, not a precise price.`
        : null,
  };
}
