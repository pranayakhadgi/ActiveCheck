/**
 * Equity-only weights: slice aggregation, identity keys and rescaling.
 *
 * Pure and deterministic — no I/O, no clock, no randomness.
 */
import type { NormalizedPortfolio, PortfolioHolding, SecurityWeight } from "./types";

/**
 * Legal-form tokens dropped from a name before comparing. They carry no
 * identity — one filer writes "Alphabet Inc Class A" where another writes
 * "Alphabet Class A" — and they turn up mid-name as often as at the end.
 *
 * Words that can be part of a real name (GROUP, HOLDINGS) stay in, and
 * share-class tokens (CL A, CL C) are deliberately kept: GOOG and GOOGL are
 * different securities, and the class is the only thing the name fallback has
 * to tell them apart.
 */
const LEGAL_TOKENS = new Set([
  "INC", "INCORPORATED", "CORP", "CORPORATION", "CO", "COMPANY", "COMPANIES",
  "LTD", "LIMITED", "PLC", "LLC", "LP", "NV", "SA", "SE", "AG", "AB", "AS",
  "OYJ", "SPA", "THE",
]);

/**
 * Normalizes an issuer name for the last-resort matching fallback:
 * uppercase, "CLASS" folded to "CL", punctuation dropped, whitespace
 * collapsed, then legal-form tokens removed.
 *
 * Deliberately conservative: matching is only ever attempted on an exact
 * normalized equality, so over-normalizing would merge distinct issuers
 * (docs/research/kimi.md #8). If stripping would empty the name, the
 * un-stripped form is kept instead.
 */
export function normalizeName(name: string): string {
  const collapsed = name
    .toUpperCase()
    .replace(/\bCLASS\b/g, "CL")
    .replace(/[.,'`"()\-/&]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const stripped = collapsed
    .split(" ")
    .filter((token) => !LEGAL_TOKENS.has(token))
    .join(" ");

  return stripped === "" ? name.toUpperCase().trim() : stripped;
}

/** An accumulating position, before rescaling. */
type Slice = {
  key: string;
  keyKind: SecurityWeight["keyKind"];
  name: string;
  /** Reported weight of the largest slice seen, which supplies the display name. */
  largestSlice: number;
  cusip: string | null;
  isin: string | null;
  nameNorm: string;
  total: number;
};

/**
 * Aggregates a portfolio's equity lines into one weight per security and
 * rescales those weights to sum to 1.
 *
 * Cash, derivatives, debt and anything unclassifiable are dropped and their
 * share of the reported portfolio is returned as `excludedPct`, because the
 * fee question is about stock picks: leaving cash in would dilute every weight
 * and understate how different the fund is.
 *
 * Slices — N-PORT splits one position across several `<invstOrSec>` lines by
 * country or exchange — are summed before any math, since counting them
 * separately would inflate active share (docs/research/kimi.md #1).
 */
export function normalizeEquityWeights(
  holdings: readonly PortfolioHolding[],
): NormalizedPortfolio {
  let reportedTotal = 0;
  let equityTotal = 0;
  const bySecurity = new Map<string, Slice>();

  for (const holding of holdings) {
    // Weights are shares of the portfolio: a short line's negative weight
    // still belongs in the denominator, so the magnitude is what we total.
    reportedTotal += Math.abs(holding.pctVal);
    if (holding.assetClass !== "equity") continue;
    equityTotal += holding.pctVal;

    const cusip = holding.cusip?.trim().toUpperCase() || null;
    const isin = holding.isin?.trim().toUpperCase() || null;
    const nameNorm = normalizeName(holding.name);
    // CUSIP → ISIN → normalized name: the identifier cascade, resolved once so
    // that everything downstream is a plain lookup on one key.
    const [key, keyKind] = cusip
      ? ([cusip, "cusip"] as const)
      : isin
        ? ([isin, "isin"] as const)
        : ([nameNorm, "name"] as const);

    const existing = bySecurity.get(key);
    if (!existing) {
      bySecurity.set(key, {
        key,
        keyKind,
        name: holding.name,
        largestSlice: holding.pctVal,
        cusip,
        isin,
        nameNorm,
        total: holding.pctVal,
      });
      continue;
    }
    existing.total += holding.pctVal;
    // Keep the identifiers any slice supplies, so a line that omits the ISIN
    // does not cost the security its fallback key.
    existing.cusip ??= cusip;
    existing.isin ??= isin;
    if (holding.pctVal > existing.largestSlice) {
      existing.largestSlice = holding.pctVal;
      existing.name = holding.name;
      existing.nameNorm = nameNorm;
    }
  }

  if (equityTotal === 0) {
    // Nothing to rescale: with no equity there is no stock-picking to price,
    // and the whole reported portfolio counts as excluded.
    return { securities: [], excludedPct: 100 };
  }

  const securities = [...bySecurity.values()]
    .filter((slice) => slice.total !== 0)
    .map(
      (slice): SecurityWeight => ({
        key: slice.key,
        keyKind: slice.keyKind,
        name: slice.name,
        cusip: slice.cusip,
        isin: slice.isin,
        nameNorm: slice.nameNorm,
        weight: slice.total / equityTotal,
      }),
    )
    // Largest position first, ties broken by key so a recompute is byte-identical.
    .sort((a, b) => b.weight - a.weight || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));

  const excluded = reportedTotal === 0 ? 0 : (reportedTotal - Math.abs(equityTotal)) / reportedTotal;

  return { securities, excludedPct: excluded * 100 };
}
