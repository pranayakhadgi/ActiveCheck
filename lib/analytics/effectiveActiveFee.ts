/** Turns the fee gap over an index fund into a price for the active part. */

/**
 * Below this active share the fee is an extrapolation from a sliver of the
 * portfolio and should be shown with a caveat, not hidden.
 */
export const UNRELIABLE_ACTIVE_SHARE = 0.2;

/**
 * Effective active fee = (fund ER − index ER) ÷ active share.
 *
 * Reads as: you can buy the index-like part of this fund for the index fund's
 * price, so the whole fee gap is the price of the part that differs. Both
 * expense ratios are decimal fractions (0.0075 = 75 bps) and so is the result.
 *
 * Returns undefined rather than Infinity when active share is 0: with nothing
 * active, the fee gap buys nothing and the ratio is not defined. A negative
 * result is meaningful (the fund is cheaper than its index) and is never
 * clamped, and a tiny active share is allowed to amplify the number — that
 * amplification is the closet-indexer signal the product exists to show.
 * Callers flag it with {@link isFeeReliable} instead of smoothing it away.
 */
export function effectiveActiveFee(
  fundExpenseRatio: number | null | undefined,
  indexExpenseRatio: number | null | undefined,
  activeShare: number,
): number | undefined {
  if (fundExpenseRatio == null || indexExpenseRatio == null) return undefined;
  if (!Number.isFinite(fundExpenseRatio) || !Number.isFinite(indexExpenseRatio)) return undefined;
  if (!Number.isFinite(activeShare) || activeShare <= 0 || activeShare > 1) return undefined;
  return (fundExpenseRatio - indexExpenseRatio) / activeShare;
}

/** False when active share is too small for the fee to be read at face value. */
export function isFeeReliable(activeShare: number): boolean {
  return activeShare >= UNRELIABLE_ACTIVE_SHARE;
}
