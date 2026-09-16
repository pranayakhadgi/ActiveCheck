/** The biggest bets a fund makes for and against its benchmark. */
import type { MatchedSecurity, WeightDifference } from "./types";

const DEFAULT_LIMIT = 10;

function toDifference(row: MatchedSecurity): WeightDifference {
  return {
    key: row.key,
    name: row.name,
    fundWeight: row.fundWeight,
    indexWeight: row.indexWeight,
    difference: row.fundWeight - row.indexWeight,
  };
}

/** Largest magnitude first; key breaks ties so the tables do not reshuffle. */
function byMagnitude(a: WeightDifference, b: WeightDifference): number {
  return (
    Math.abs(b.difference) - Math.abs(a.difference) ||
    (a.key < b.key ? -1 : a.key > b.key ? 1 : 0)
  );
}

/**
 * Splits the matched union into the fund's biggest overweights and
 * underweights — the two tables on the fund page, which show *where* the
 * active share comes from.
 *
 * Securities held at identical weight on both sides contribute nothing to
 * active share and are left out of both tables.
 */
export function topOverUnderweights(
  rows: readonly MatchedSecurity[],
  limit = DEFAULT_LIMIT,
): { overweights: WeightDifference[]; underweights: WeightDifference[] } {
  const differences = rows.map(toDifference);
  return {
    overweights: differences.filter((r) => r.difference > 0).sort(byMagnitude).slice(0, limit),
    underweights: differences.filter((r) => r.difference < 0).sort(byMagnitude).slice(0, limit),
  };
}
