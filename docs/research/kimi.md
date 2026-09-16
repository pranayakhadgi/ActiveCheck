# 1. SCHEMA

```sql
-- Registrant-level entity (the management company / fund series)
CREATE TABLE funds (
  fund_id        BIGSERIAL PRIMARY KEY,
  cik            TEXT NOT NULL,                -- SEC CIK of registrant
  series_id      TEXT NOT NULL,                -- SEC series identifier
  fund_name      TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cik, series_id)                      -- a fund is uniquely identified by registrant+series; prevents duplicate fund rows on re-load
);

-- Share classes of a series (each has its own holdings filing)
CREATE TABLE share_classes (
  share_class_id BIGSERIAL PRIMARY KEY,
  fund_id        BIGINT NOT NULL REFERENCES funds(fund_id) ON DELETE CASCADE,
  class_id       TEXT NOT NULL,                -- SEC class identifier
  ticker         TEXT,
  class_name     TEXT NOT NULL,
  UNIQUE (fund_id, class_id)                   -- one row per SEC class id; re-loads upsert instead of insert
);
CREATE INDEX idx_share_classes_fund ON share_classes(fund_id);

-- One row per N-PORT filing (the dedupe key for the whole load)
CREATE TABLE filings (
  filing_id      BIGSERIAL PRIMARY KEY,
  share_class_id BIGINT NOT NULL REFERENCES share_classes(share_class_id) ON DELETE CASCADE,
  accession_no   TEXT NOT NULL,                -- e.g. 0001752724-24-000123
  report_period  DATE NOT NULL,                -- month-end the holdings snapshot refers to
  filed_at       TIMESTAMPTZ,
  raw_xml_uri    TEXT,
  loaded_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (accession_no)                        -- accession number is globally unique in EDGAR; makes every load safely re-runnable
);
-- One filing per class per period; guards against double-processing the same period
CREATE UNIQUE INDEX uq_filing_class_period ON filings(share_class_id, report_period);
CREATE INDEX idx_filings_period ON filings(report_period);

-- Normalized holdings from each filing
CREATE TABLE holdings (
  holding_id     BIGSERIAL PRIMARY KEY,
  filing_id      BIGINT NOT NULL REFERENCES filings(filing_id) ON DELETE CASCADE,
  cusip          TEXT,                         -- nullable: some lines lack CUSIP
  isin           TEXT,
  name_raw       TEXT NOT NULL,
  name_norm      TEXT NOT NULL,                -- normalized for matching fallback
  asset_cat      TEXT NOT NULL,                -- 'equity' | 'cash' | 'derivative' | 'debt' | 'other'
  pct_nav        NUMERIC(12,6) NOT NULL,       -- as reported (% of NAV)
  pct_rescaled   NUMERIC(12,6),                -- equity-only rescaled weight, computed at load
  country        TEXT,
  exchange       TEXT,
  UNIQUE (filing_id, cusip, name_raw, asset_cat)  -- N-PORT can repeat a CUSIP on multiple lines (slices); we must aggregate BEFORE insert, and this constraint catches any aggregate slip
);
CREATE INDEX idx_holdings_filing ON holdings(filing_id);
CREATE INDEX idx_holdings_cusip  ON holdings(cusip);
CREATE INDEX idx_holdings_isin   ON holdings(isin);
CREATE INDEX idx_holdings_name   ON holdings(name_norm);

-- Index/benchmark definitions
CREATE TABLE benchmarks (
  benchmark_id   BIGSERIAL PRIMARY KEY,
  ticker         TEXT NOT NULL,                -- e.g. 'IVV', 'VTI'
  name           TEXT NOT NULL,
  reconstitutes  DATE,                         -- last known rebalance date
  UNIQUE (ticker)                              -- one canonical row per index ticker
);

-- Index holdings, versioned by rebalance date
CREATE TABLE benchmark_holdings (
  benchmark_id   BIGINT NOT NULL REFERENCES benchmarks(benchmark_id) ON DELETE CASCADE,
  as_of          DATE NOT NULL,                -- rebalance/effective date
  cusip          TEXT,
  isin           TEXT,
  name_norm      TEXT NOT NULL,
  weight         NUMERIC(12,6) NOT NULL,       -- index weight, sums to 1
  PRIMARY KEY (benchmark_id, as_of, cusip)     -- composite PK: one weight per security per rebalance; re-loads of the same vintage upsert cleanly
);
CREATE INDEX idx_bh_lookup ON benchmark_holdings(cusip, as_of);

-- Expense ratios, versioned (ERs change over time)
CREATE TABLE expense_ratios (
  share_class_id BIGINT REFERENCES share_classes(share_class_id) ON DELETE CASCADE,
  benchmark_id   BIGINT REFERENCES benchmarks(benchmark_id) ON DELETE CASCADE,
  as_of          DATE NOT NULL,
  er             NUMERIC(8,4) NOT NULL,        -- e.g. 0.0009 = 9 bps
  PRIMARY KEY (share_class_id, as_of)          -- one ER per class per date; history preserved, re-load upserts
);
CREATE INDEX idx_er_benchmark ON expense_ratios(benchmark_id, as_of);

-- Persisted analytics results (idempotent by definition of the run)
CREATE TABLE results (
  result_id      BIGSERIAL PRIMARY KEY,
  filing_id      BIGINT NOT NULL REFERENCES filings(filing_id) ON DELETE CASCADE,
  benchmark_id   BIGINT NOT NULL REFERENCES benchmarks(benchmark_id),
  active_share   NUMERIC(10,6) NOT NULL CHECK (active_share >= 0 AND active_share <= 1),
  unmatched_pct  NUMERIC(10,6) NOT NULL,       -- % of fund weight unmatched to index securities
  excluded_pct   NUMERIC(10,6) NOT NULL,       -- % of NAV excluded as non-equity
  eff_active_fee NUMERIC(12,4),                -- NULL when active_share = 0
  computed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (filing_id, benchmark_id)             -- one result per filing×benchmark pair; recompute = upsert, never duplicate
);
```

**Unique-constraint rationale (one line each):**
- `funds(cik, series_id)`: SEC identifiers are the natural key; stops the loader from creating a second fund row when a filing is re-processed.
- `share_classes(fund_id, class_id)`: SEC class ID is unique within a series; re-loads upsert the class instead of erroring or duplicating.
- `filings(accession_no)`: the accession number is EDGAR's globally unique filing ID — this is the single constraint that makes `npm run load` idempotent.
- `uq_filing_class_period`: prevents two *different* filings from being treated as the same period snapshot for one class (catches EDGAR amendments gone wrong).
- `holdings(filing_id, cusip, name_raw, asset_cat)`: N-PORT legitimately repeats a CUSIP across slices; we aggregate slices at load time, and this constraint turns any aggregation bug into a hard failure instead of silent double-counting.
- `benchmarks(ticker)`: one canonical index entity per ticker.
- `benchmark_holdings(benchmark_id, as_of, cusip)`: one weight per security per rebalance vintage; re-loading the same vintage is a no-op upsert.
- `expense_ratios(share_class_id, as_of)`: ERs are time-varying; this keeps full history while making same-date re-loads idempotent.
- `results(filing_id, benchmark_id)`: analytics are a pure function of (filing, benchmark); one row per pair means recompute never duplicates.

---

# 2. EDGE CASES — ranked by likelihood of corrupting active share

1. **Duplicate lines for one security (N-PORT "slices").** N-PORT splits one position across multiple `<invstOrSec>` lines by country/exchange/counterparty; **rule: aggregate all lines sharing (filing, CUSIP, asset category) into a single weight before any math**, and let the holdings unique constraint enforce it.
2. **Missing or malformed CUSIPs (9th check-digit failures, `NULL`, placeholder `000000000`).** **Rule: never match on a CUSIP that fails check-digit validation or is all zeros; fall back to ISIN, then normalized name, and count the weight as unmatched if all three fail.**
3. **Report-date mismatch between fund and index.** A fund's 6/30 holdings compared against an index reconstituted 6/20 (or a stale benchmark vintage) inflates active share. **Rule: always join fund holdings to the benchmark vintage whose `as_of` ≤ report_period is latest, and display both dates on every result.**
4. **ADRs vs. ordinary shares (Nokia NYSE vs. Nokia Helsinki).** The fund holds the ADR, the index holds the ordinary line — same economic exposure, different CUSIP. **Rule: maintain an explicit ADR→ordinary mapping table (or use the SEC's own reference data) and normalize both sides to the ordinary share before comparing weights.**
5. **Cash, futures, and non-equity lines.** Per the spec these are excluded and weights rescaled, but a futures overlay on an index (common for equitization) silently changes effective exposure. **Rule: exclude non-equity from the weight vector, report `excluded_pct` prominently, and flag filings where excluded_pct > 10% as low-confidence.**
6. **Share-class lines like GOOG vs. GOOGL (dual-class listings).** Indices typically hold one share class; the fund may hold the other. **Rule: treat share classes as distinct securities (they have distinct CUSIPs and votes) — do NOT merge them — but surface a "share-class mismatch" warning when the matched pair differs only by class.**
7. **Unit mismatch: N-PORT reports % of NAV, index weights may be shares or bps.** **Rule: store everything as decimal fractions in one column (`pct_nav`, `weight`) with a CHECK constraint, and normalize to sum-to-1 on equity only, at load time.**
8. **Name normalization collisions.** "Alphabet Inc Class A" vs "ALPHABET INC CL A" vs "Alphabet Inc." — over-aggressive normalization merges distinct companies; under-aggressive fails to match. **Rule: normalize (uppercase, strip punctuation/legal suffixes, collapse whitespace) and require a minimum token-overlap score before accepting a name match; never let name matching silently override a valid CUSIP/ISIN match.**
9. **Fund-of-funds / look-through.** A fund holding an ETF (e.g., a target-date fund holding IVV) shows a single CUSIP where the index shows hundreds. **Rule: detect ETF/ fund holdings (asset category or issuer type) and either look through to the ETF's holdings or exclude the filing from active-share computation with a clear "not comparable" flag.**
10. **Currency and DR line items in the wrong bucket.** N-PORT's asset categories are sometimes miscoded by filers (a currency forward filed as equity). **Rule: classify by instrument type fields (not filer-supplied category alone) using a deterministic mapping, and quarantine unclassifiable lines into `other` with a logged reason.**
11. **Amendments and restatements.** A later N-PORT/A amends an earlier filing; keeping both double-counts the period. **Rule: the `uq_filing_class_period` index forces one filing per class-period — an amendment must supersede (delete + replace) the original in the same transaction.**
12. **Index share-class/ADR weighting within the benchmark.** Some indices weight dual-class lines separately; others combine. **Rule: store index holdings exactly as the index provider publishes, and apply the same ADR normalization from #4 symmetrically so both sides use identical security identifiers before the L1 distance is computed.**

---

# 3. TEST CASES

```ts
// lib/analytics/__tests__/activeShare.test.ts
describe("activeShare", () => {
  test("identical portfolios → 0", () => {
    // input: fund {AAPL:0.6, MSFT:0.4}, index {AAPL:0.6, MSFT:0.4}
    // expected: 0
  });

  test("disjoint portfolios → 1", () => {
    // input: fund {AAPL:1.0}, index {MSFT:1.0}
    // expected: 1
  });

  test("single-security overlap at 50% weight → 0.5", () => {
    // input: fund {AAPL:0.5, TSLA:0.5}, index {AAPL:1.0}
    // expected: 0.5
  });

  test("empty fund holdings → active share 1 with unmatched 100%", () => {
    // input: fund {}, index {AAPL:1.0}
    // expected: 1 (all index weight is unmatched); excluded_pct = 100
  });

  test("non-equity lines excluded before rescale → equity-only comparison", () => {
    // input: fund {AAPL:0.5, CASH:0.3, MSFT:0.2}, index {AAPL:0.6, MSFT:0.4}
    // expected: fund equity rescaled to {AAPL:0.714286, MSFT:0.285714}; active share ≈ 0.114286; excluded_pct = 30
  });
});

// lib/analytics/__tests__/closestIndex.test.ts
describe("closestIndex", () => {
  test("picks the index with minimum active share among candidates", () => {
    // input: fund {AAPL:0.7, MSFT:0.3}; idx1 {AAPL:0.5, MSFT:0.5} (AS=0.2), idx2 {AAPL:1.0} (AS=0.3)
    // expected: idx1
  });

  test("ties broken deterministically by benchmark ticker (ascending)", () => {
    // input: two indices with identical AS=0.4
    // expected: the one with lexicographically smaller ticker — determinism for tests and caching
  });

  test("index with zero overlapping securities never wins over a partially overlapping one", () => {
    // input: idx_disjoint AS=1, idx_partial AS=0.6
    // expected: idx_partial
  });
});

// lib/analytics/__tests__/effectiveActiveFee.test.ts
describe("effectiveActiveFee", () => {
  test("active share 0 → fee is undefined (not Infinity, not 0)", () => {
    // input: fund ER 0.75%, index ER 0.09%, activeShare 0
    // expected: undefined (division by zero); persisted as NULL
  });

  test("typical case: (75bps − 9bps) / 0.6 = 110bps", () => {
    // input: fund ER 0.0075, index ER 0.0009, activeShare 0.6
    // expected: 0.0110 (110 bps)
  });

  test("fund cheaper than index with positive active share → negative effective fee", () => {
    // input: fund ER 0.0005, index ER 0.0009, activeShare 0.4
    // expected: -0.0010 — negative is meaningful (you're paid to be different), must not be clamped
  });

  test("tiny active share amplifies fee (numerical-stability guard)", () => {
    // input: fund ER 0.0075, index ER 0.0009, activeShare 0.001
    // expected: 6.6 — function returns it, but caller flags |fee| > some threshold as unreliable
  });

  test("active share exactly 1 with equal ERs → 0", () => {
    // input: fund ER 0.0009, index ER 0.0009, activeShare 1
    // expected: 0
  });
});
```

---

# 4. INTERVIEW QUESTIONS

**Q1. Your active share depends entirely on which index you pick as "closest." Isn't "closest index" circular — you're choosing the benchmark that makes the fund look most passive?**
A: It's descriptive, not normative — we report the distance to the *nearest* benchmark as the upper bound on how different the fund is from *any* cheap alternative, which is exactly the right null hypothesis for "what am I paying for?" The effective active fee against the closest index is the *most charitable* reading of the manager's fee; if the number still looks bad against the friendliest benchmark, the conclusion is robust.

**Q2. N-PORT filings are monthly and self-reported, with known errors, amendments, and inconsistent tagging. How do you know two filings from the same month aren't double-counted, and how do you handle restatements?**
A: The `(share_class_id, report_period)` unique index guarantees one snapshot per class per month, so an amendment must delete-and-replace the original in one transaction — the loader is idempotent by constraint, not by convention. We key everything on the accession number and treat a later filing for the same period as a supersession, keeping only the latest `filed_at`.

**Q3. ADRs, dual-class shares, and H-shares vs A-shares create false "active" bets. How does your matching logic avoid penalizing a fund for holding the ADR of an index constituent?**
A: We normalize both sides to an economic-exposure key before computing weights: an explicit ADR→ordinary mapping (from SEC reference data) collapses the ADR and the ordinary line into one security, and we deliberately do *not* merge dual-class lines like GOOG/GOOGL since they are genuinely different securities — but we surface a share-class-mismatch warning so the user sees the exposure is the same company.

**Q4. Your formula rescales equity weights to sum to 1, which implicitly assumes cash and futures have zero tracking impact. A fund equitized with S&P futures plus cash will look identical to an index fund. Doesn't that break your core metric?**
A: It does, and the design admits it: we report `excluded_pct` on every result and flag any filing where non-equity exceeds a threshold (e.g., 10%) as low-confidence rather than silently rescaling. A futures-overlaid fund is genuinely hard to evaluate from N-PORT alone — the honest answer is to show the number *and* its caveat, not to pretend the holdings file tells the whole story.

**Q5. Active share is known to be biased for concentrated funds and funds with many small positions — and it says nothing about factor exposures. Why is it the right number here?**
A: It isn't the whole story, which is why the product answers one narrow question — "how much of the fee pays for deviation from an indexable portfolio?" — rather than claiming to measure skill. The effective active fee is a *cost-per-unit-of-differentiation* metric; whether that differentiation earns its keep is a question we deliberately leave to the user.

**Q6. How do you handle a fund that holds an ETF (fund-of-funds)? Comparing a target-date fund's single ETF line against a 500-stock index gives active share ≈ 1, which is meaningless.**
A: We detect holdings that are themselves funds/ETFs and either look through to the ETF's own N-PORT holdings (recursive, capped at one level) or mark the filing as "not comparable" and exclude it from results. Reporting a nonsense 0.98 active share for a fund-of-funds would be worse than reporting nothing — the design treats comparability as a precondition for showing a number.

**Q7. Your expense-ratio history and index reconstitution dates mean the same filing can produce different results over time. Is your `results` table reproducible, and how do you prevent stale benchmark vintages?**
A: Every result row is a pure function of (filing, benchmark vintage, ER as-of), and we join on "latest vintage ≤ report_period" at compute time, then store which vintage was used — so any row can be recomputed exactly. If a benchmark vintage is corrected, we bump `as_of` and recompute affected results in a transaction, because `results(filing_id, benchmark_id)` upserts rather than appends.

**Q8. Two funds with identical active share can have wildly different fees, and your metric divides by active share — so a fund with 1% active share and a 1bp fee gap shows a 100% "effective fee." Isn't the metric numerically unstable exactly where it matters most?**
A: The instability is real but informative: a large fee gap over a tiny active share *is* an extreme result, and we surface it rather than clamping it — the UI shows the raw number with a reliability flag when active share is small. The alternative (capping or smoothing) would hide the very funds the metric exists to expose: closet indexers charging active fees for near-zero differentiation.