# data/

## expense_ratios.csv

One row per fixture fund. `scripts/load.ts` reads it to populate `funds.expense_ratio`,
`funds.er_as_of` and `funds.is_index`.

| Column | Meaning |
|---|---|
| `ticker` | The single share class ActiveCheck quotes for this series. |
| `series_id`, `cik` | SEC identifiers, resolved from `https://www.sec.gov/files/company_tickers_mf.json`. |
| `name` | Series name, as filed in the N-PORT `genInfo/seriesName`. |
| `is_index` | `true` makes the fund usable as a benchmark. |
| `expense_ratio` | **Decimal fraction**, not a percentage: `0.000300` = 3 bps = 0.03 %/yr. |
| `er_as_of` | Prospectus date the ratio came from. Empty while the value is unverified. |
| `er_verified` | `verified` or `unverified`. Anything `unverified` must be surfaced in the UI. |
| `er_source` | Where the number came from, and what would verify it. |

### Every expense ratio in this file is currently `unverified`

`docs/research/perplexity.md` was the source for this table but supplies **no fee values
at all**:

- Section 5 explicitly declines to give a verified net expense ratio for any active
  large-cap fund, and marks the requested values **unverified**.
- Section 4 identifies the SEC Mutual Fund Prospectus Risk/Return Summary Data Sets as
  the right free official source, but marks the net-expense-ratio **field name** itself
  unverified and warns against assuming a column label.

The ratios below are therefore placeholders carrying each fund's publicly quoted headline
fee, kept so the pipeline has real-shaped inputs end to end. To promote a row to
`verified`, pull the fund's latest prospectus (497K for the ETFs, 497/N-1A for the mutual
funds) or the MFRR data set for the relevant quarter, record the prospectus date in
`er_as_of`, and cite the accession number in `er_source`.

The series IDs and CIKs in this file are *not* affected: perplexity.md verifies the three
iShares series against SEC filings, and the three active funds were resolved through the
SEC's own ticker→series file rather than typed in by hand.
