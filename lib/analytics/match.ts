/**
 * Lines a fund's securities up against a benchmark's, so the two weight
 * vectors can be compared position by position.
 */
import type {
  MatchResult,
  MatchedSecurity,
  NormalizedPortfolio,
  SecurityWeight,
} from "./types";

type MatchKind = NonNullable<MatchedSecurity["matchedOn"]>;

/**
 * Builds a lookup from one identifier to a benchmark security. A value held by
 * two different securities is dropped rather than resolved arbitrarily: an
 * ambiguous key is no better than no key, and silently picking one would
 * assign the wrong benchmark weight.
 */
function lookup(
  securities: readonly SecurityWeight[],
  pick: (s: SecurityWeight) => string | null,
): Map<string, SecurityWeight> {
  const map = new Map<string, SecurityWeight>();
  const ambiguous = new Set<string>();
  for (const security of securities) {
    const value = pick(security);
    if (!value) continue;
    if (map.has(value)) ambiguous.add(value);
    map.set(value, security);
  }
  for (const value of ambiguous) map.delete(value);
  return map;
}

/**
 * Matches fund securities to benchmark securities on CUSIP, then ISIN, then
 * normalized name, and returns the union of both portfolios.
 *
 * The passes run in that order across the whole portfolio rather than per
 * holding, so a weaker name match can never claim a benchmark security that a
 * CUSIP match wants. Each benchmark security is claimed at most once, which is
 * what keeps the benchmark's weights summing to 1 across the union.
 */
export function matchSecurities(
  fund: NormalizedPortfolio,
  index: NormalizedPortfolio,
): MatchResult {
  const byCusip = lookup(index.securities, (s) => s.cusip);
  const byIsin = lookup(index.securities, (s) => s.isin);
  const byName = lookup(index.securities, (s) => s.nameNorm);

  const passes: readonly [MatchKind, Map<string, SecurityWeight>, (s: SecurityWeight) => string | null][] = [
    ["cusip", byCusip, (s) => s.cusip],
    ["isin", byIsin, (s) => s.isin],
    ["name", byName, (s) => s.nameNorm],
  ];

  const pairedIndex = new Map<SecurityWeight, MatchKind>();
  const matchedFor = new Map<SecurityWeight, { index: SecurityWeight; on: MatchKind }>();

  for (const [kind, map, pick] of passes) {
    for (const security of fund.securities) {
      if (matchedFor.has(security)) continue;
      const value = pick(security);
      if (!value) continue;
      const candidate = map.get(value);
      if (!candidate || pairedIndex.has(candidate)) continue;
      pairedIndex.set(candidate, kind);
      matchedFor.set(security, { index: candidate, on: kind });
    }
  }

  const rows: MatchedSecurity[] = [];
  let matchedWeight = 0;

  for (const security of fund.securities) {
    const pair = matchedFor.get(security);
    if (pair) matchedWeight += security.weight;
    rows.push({
      key: security.key,
      name: security.name,
      fundWeight: security.weight,
      indexWeight: pair?.index.weight ?? 0,
      matchedOn: pair?.on ?? null,
    });
  }

  let unmatchedIndexWeight = 0;
  for (const security of index.securities) {
    if (pairedIndex.has(security)) continue;
    unmatchedIndexWeight += security.weight;
    rows.push({
      key: security.key,
      name: security.name,
      fundWeight: 0,
      indexWeight: security.weight,
      matchedOn: null,
    });
  }

  // Biggest position on either side first; key breaks ties so the union is
  // ordered the same way on every recompute.
  rows.sort(
    (a, b) =>
      Math.max(b.fundWeight, b.indexWeight) - Math.max(a.fundWeight, a.indexWeight) ||
      (a.key < b.key ? -1 : a.key > b.key ? 1 : 0),
  );

  const fundWeight = fund.securities.reduce((total, s) => total + s.weight, 0);

  return {
    rows,
    matchedPct: matchedWeight * 100,
    unmatchedFundPct: (fundWeight - matchedWeight) * 100,
    unmatchedIndexPct: unmatchedIndexWeight * 100,
  };
}
