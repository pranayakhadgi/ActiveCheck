/** Test-only builders. Kept out of the public surface in `index.ts`. */
import type { PortfolioHolding } from "./types";

/**
 * Builds equity holdings from a `{ name: pctVal }` map, using the name as the
 * CUSIP so the tests match on the primary identifier rather than the fallback.
 */
export function equities(weights: Record<string, number>): PortfolioHolding[] {
  return Object.entries(weights).map(([name, pctVal]) => ({
    name,
    cusip: name,
    isin: null,
    assetClass: "equity",
    pctVal,
  }));
}

/** A single non-equity line, e.g. `cash("CASH", 0.3)`. */
export function cash(name: string, pctVal: number): PortfolioHolding {
  return { name, cusip: null, isin: null, assetClass: "cash", pctVal };
}
