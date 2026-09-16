/**
 * Maps parsed N-PORT holdings onto the vocabulary `lib/analytics/` and the
 * `holdings.asset_cat` CHECK constraint share, so the filer's `assetCat` code
 * is interpreted in exactly one place.
 *
 * Pure: no I/O, safe to call from the loader and from tests alike.
 */
import type { AssetClass, PortfolioHolding } from "@/lib/analytics/types";

import type { AssetCat, Holding } from "./types";

/**
 * Only common equity (`EC`) counts as a stock pick. Preferred shares (`EP`)
 * are excluded: index funds hold the common line, so a preferred position
 * would be a permanent unmatched "bet" against a benchmark that cannot hold it.
 */
const ASSET_CLASS: Record<AssetCat, AssetClass> = {
  EC: "equity",
  EP: "other",
  DBT: "debt",
  STIV: "cash", // short-term investment vehicle — a cash sweep, not a stock pick
  RA: "cash", // repurchase agreement
  DE: "derivative",
  OTHER: "other",
};

export function assetClassOf(assetCat: AssetCat): AssetClass {
  return ASSET_CLASS[assetCat];
}

/** Converts parsed holdings into the shape `normalizeEquityWeights` expects. */
export function toPortfolioHoldings(holdings: readonly Holding[]): PortfolioHolding[] {
  return holdings.map((holding) => ({
    name: holding.name,
    cusip: holding.cusip,
    isin: holding.isin,
    assetClass: assetClassOf(holding.assetCat),
    // pctVal is filed as a percentage already summing to ~100 — never scale it here.
    pctVal: holding.pctVal,
  }));
}
