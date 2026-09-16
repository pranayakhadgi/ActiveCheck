-- 002_results.sql — precomputed comparisons, one row per (fund filing, benchmark filing).
--
-- 001 deliberately had no results table: the analytics layer is pure and fast,
-- so the fund page could recompute on every read. That no longer holds — the
-- page is a server component reading Postgres directly, and recomputing meant
-- pulling every holding of the fund *and* all three benchmarks (~1,900 rows) on
-- each request just to render three numbers. The loader is the only writer, so
-- these tables are a materialisation of `lib/analytics/`, never a second source
-- of truth: `npm run load` recomputes and replaces them wholesale.

-- Expense-ratio provenance. data/expense_ratios.csv currently carries no
-- verified ratio at all, so the fund page has to be able to say so.
ALTER TABLE funds ADD COLUMN er_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE funds ADD COLUMN er_source TEXT;

CREATE TABLE results (
  id                     BIGSERIAL PRIMARY KEY,
  filing_id              BIGINT NOT NULL REFERENCES filings(id) ON DELETE CASCADE,
  benchmark_filing_id    BIGINT NOT NULL REFERENCES filings(id) ON DELETE CASCADE,

  -- Decimal fraction 0–1, from lib/analytics/activeShare.ts.
  active_share           NUMERIC(10,8) NOT NULL CHECK (active_share BETWEEN 0 AND 1),
  -- (fund ER − benchmark ER) ÷ active share, a decimal fraction. NULL when
  -- undefined: active share 0, or either expense ratio missing. Never clamped,
  -- so a negative value (the fund is cheaper than its index) survives to the UI.
  effective_active_fee   NUMERIC(12,8),

  -- Data-quality figures, all percentages 0–100.
  matched_pct            NUMERIC(10,6) NOT NULL,
  unmatched_fund_pct     NUMERIC(10,6) NOT NULL,
  unmatched_index_pct    NUMERIC(10,6) NOT NULL,
  excluded_pct           NUMERIC(10,6) NOT NULL,  -- non-equity dropped from the fund
  benchmark_excluded_pct NUMERIC(10,6) NOT NULL,  -- non-equity dropped from the benchmark

  -- The benchmark with the lowest active share, i.e. the closest index.
  is_closest             BOOLEAN NOT NULL DEFAULT FALSE,
  computed_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (filing_id <> benchmark_filing_id),
  UNIQUE (filing_id, benchmark_filing_id)
);
-- Exactly one closest index per filing, enforced rather than trusted: the fund
-- page selects on this flag, and two winners would render an arbitrary one.
CREATE UNIQUE INDEX results_one_closest_idx ON results (filing_id) WHERE is_closest;

-- The top over/underweight rows behind each result — the two tables on the
-- fund page. Stored per result, not only for the closest index, so the
-- comparison table can drill into any benchmark without a recompute.
CREATE TABLE result_weights (
  id           BIGSERIAL PRIMARY KEY,
  result_id    BIGINT NOT NULL REFERENCES results(id) ON DELETE CASCADE,
  side         TEXT NOT NULL CHECK (side IN ('overweight', 'underweight')),
  rank         SMALLINT NOT NULL CHECK (rank >= 1),  -- 1 = biggest bet
  match_key    TEXT NOT NULL,
  name         TEXT NOT NULL,
  -- Equity-only rescaled weights, decimal fractions summing to 1 per side.
  fund_weight  NUMERIC(12,10) NOT NULL,
  index_weight NUMERIC(12,10) NOT NULL,
  difference   NUMERIC(12,10) NOT NULL,  -- fund_weight − index_weight
  UNIQUE (result_id, side, rank)
);
CREATE INDEX result_weights_result_idx ON result_weights (result_id, side, rank);
