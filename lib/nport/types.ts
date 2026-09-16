/** Asset categories N-PORT reports. Only `EC` counts as equity for active share. */
export type AssetCat = "EC" | "EP" | "DBT" | "STIV" | "RA" | "DE" | "OTHER";

export type Holding = {
  /** Issuer name as filed. */
  name: string;
  /** Security title; more specific than `name` for non-common instruments. */
  title: string;
  /** 9-character CUSIP, uppercased, or null when the filing reports none. */
  cusip: string | null;
  /** ISIN from `identifiers/isin@value`, uppercased, or null. */
  isin: string | null;
  /** Exchange ticker from `identifiers/ticker@value`, or null. */
  ticker: string | null;
  /** Market value in USD. */
  valUSD: number;
  /** Percent of net assets, as filed — already a percentage, so ~100 sums per filing. */
  pctVal: number;
  /** `assetCat` as filed, bucketed to `OTHER` when absent or unrecognised. */
  assetCat: AssetCat;
  /** `payoffProfile` as filed ("Long", "Short", "N/A"), or null when absent. */
  payoffProfile: string | null;
};

export type NportFiling = {
  /** Series identifier, S000xxxxxx — the fund, not the share class. */
  seriesId: string;
  /** Holdings as-of date from `genInfo/repPdDate`, as `YYYY-MM-DD`. */
  reportDate: string;
  /** Net assets in USD from `fundInfo/netAssets`. */
  netAssets: number;
  holdings: Holding[];
};
