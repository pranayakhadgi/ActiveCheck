-- 003_holdings_key_per_asset_cat.sql — a match key is unique *within* an asset class.
--
-- 002 assumed (filing_id, match_key) was unique. It is not. Contrafund holds
-- both the common and the preferred line of 14 private companies (SpaceX,
-- Stripe, Gusto and others); none of them has a CUSIP or an ISIN, so both lines
-- fall through to the normalized-name key and collide.
--
-- Aggregating them together would fold a preferred stake into the common line,
-- which is exactly what excluding `EP` from equity was meant to prevent. So the
-- loader aggregates slices per (match_key, asset_cat) — the same grouping
-- `normalizeEquityWeights` does within equity — and the index follows.
DROP INDEX holdings_filing_key_idx;
CREATE UNIQUE INDEX holdings_filing_key_idx ON holdings (filing_id, match_key, asset_cat);
