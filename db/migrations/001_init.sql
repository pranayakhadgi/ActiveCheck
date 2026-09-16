-- 001_init.sql — core schema for ActiveCheck.
-- Index funds stand in for indexes, so a benchmark is just a fund with is_index = true;
-- there is no separate benchmarks table.

-- One row per SEC series (the fund itself). Share classes are not modelled yet:
-- holdings are reported at series level, so the MVP stores one representative
-- ticker and expense ratio per series.
CREATE TABLE funds (
  id            BIGSERIAL PRIMARY KEY,
  series_id     TEXT NOT NULL UNIQUE,          -- SEC series identifier, e.g. S000004310
  cik           TEXT NOT NULL,                 -- registrant CIK
  name          TEXT NOT NULL,
  ticker        TEXT,                          -- share class whose ER we use
  expense_ratio NUMERIC(8,6),                  -- decimal fraction, e.g. 0.0075 = 75 bps
  er_as_of      DATE,                          -- prospectus date the ER came from
  is_index      BOOLEAN NOT NULL DEFAULT FALSE,-- true = usable as a benchmark
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX funds_is_index_idx ON funds (is_index) WHERE is_index;

-- One row per N-PORT filing. The accession number is the dedupe key for a load.
CREATE TABLE filings (
  id            BIGSERIAL PRIMARY KEY,
  fund_id       BIGINT NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
  accession_no  TEXT NOT NULL UNIQUE,          -- e.g. 0001752724-24-000123
  report_period DATE NOT NULL,                 -- month-end the holdings describe
  filed_at      DATE,
  source_url    TEXT,
  loaded_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (fund_id, report_period)              -- one snapshot per fund per period
);
CREATE INDEX filings_fund_period_idx ON filings (fund_id, report_period DESC);

-- Holdings as parsed from the filing. Slices of one security are aggregated
-- before insert; the unique constraint turns any aggregation bug into a hard error.
CREATE TABLE holdings (
  id         BIGSERIAL PRIMARY KEY,
  filing_id  BIGINT NOT NULL REFERENCES filings(id) ON DELETE CASCADE,
  cusip      TEXT,                             -- nullable: not every line has one
  isin       TEXT,
  name_raw   TEXT NOT NULL,
  name_norm  TEXT NOT NULL,                    -- uppercased/stripped, name-match fallback
  asset_cat  TEXT NOT NULL
    CHECK (asset_cat IN ('equity', 'debt', 'derivative', 'cash', 'other')),
  pct_val    NUMERIC(12,8) NOT NULL,           -- % of NAV as reported, decimal fraction
  match_key  TEXT NOT NULL                     -- cusip | isin | name_norm, chosen at load
);
CREATE UNIQUE INDEX holdings_filing_key_idx ON holdings (filing_id, match_key);
CREATE INDEX holdings_cusip_idx ON holdings (cusip) WHERE cusip IS NOT NULL;
