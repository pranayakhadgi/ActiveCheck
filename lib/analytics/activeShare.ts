/** Active share: how much of a fund is not its benchmark. */
import type { MatchedSecurity } from "./types";

/**
 * Active share = ½ × Σ |w_fund,i − w_index,i| over the union of securities.
 *
 * **Why the ½.** Both weight vectors sum to 1, so every dollar the fund puts
 * *above* the index in one security has to come *out* of another: each
 * overweight is mirrored by an underweight of exactly the same total size. The
 * raw sum of absolute differences therefore counts the same repositioned money
 * twice — once where it went, once where it came from. Halving it gives the
 * share of the portfolio that would have to be traded to become the index: 0
 * for a pure index fund, 1 for a portfolio with nothing in common with it.
 *
 * Equivalently — and this is what the code computes — it is the total
 * overweight, which equals the total underweight, which equals the half-sum.
 * They come apart only when a side sums to something other than 1, which here
 * means a portfolio with no equity at all: then the larger of the two is the
 * honest answer (an empty fund shares nothing with the index, so 1, not ½).
 */
export function activeShare(
  rows: readonly Pick<MatchedSecurity, "fundWeight" | "indexWeight">[],
): number {
  let overweight = 0;
  let underweight = 0;
  for (const row of rows) {
    const difference = row.fundWeight - row.indexWeight;
    if (difference > 0) overweight += difference;
    else underweight -= difference;
  }
  return Math.max(overweight, underweight);
}
