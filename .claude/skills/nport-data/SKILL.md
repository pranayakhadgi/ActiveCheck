---
name: nport-data
description: Use when fetching, parsing, loading or matching SEC N-PORT filings or fund expense ratios for ActiveCheck.
---

# Working with N-PORT data

## Fetching (SEC fair-access policy)
- Every request sends `User-Agent: ActiveCheck Pranaya Khadgi Shahi qh85275@truman.edu`
- Max 10 requests/second; add a small delay and retry on 429/503 with backoff
- Filing index: `https://data.sec.gov/submissions/CIK##########.json` (10-digit, zero-padded)
- Form types: `NPORT-P` (public). Holdings live in `primary_doc.xml` inside the filing folder
- Cache raw XML to disk before parsing; never re-download what is cached

## Identity
- A registrant CIK is a *trust* that can contain many *series* (funds). Key everything on `seriesId` (S000xxxxxx)
- Share classes (C000xxxxxx) share one portfolio but have different fees
- SPY is a UIT and does not file N-PORT. Use iShares/Vanguard index funds as benchmarks

## Parsing (verify element names against the fixture before relying on them)
- `genInfo/seriesId`, `genInfo/repPdDate` (report period end)
- `fundInfo/totAssets`, `fundInfo/netAssets`
- `invstOrSecs/invstOrSec`: `name`, `title`, `cusip`, `identifiers/isin@value`, `valUSD`, `pctVal`, `assetCat`, `payoffProfile`
- Equity = `assetCat` "EC" with `payoffProfile` "Long". Everything else is excluded from weights and reported as excluded %
- CUSIP can be "000000000" or "N/A". Treat those as missing

## Matching
1. CUSIP (9 characters, uppercased)
2. ISIN
3. Normalized name (uppercase, strip punctuation and suffixes like INC/CORP/CO/LTD/CLASS A)
Aggregate duplicate lines for the same security before comparing. Report the matched % of fund weight.

## Loading
- Upsert `filings` on `accession_number`; delete and re-insert holdings for that filing in one transaction
- Tests use files in `fixtures/nport/` only (no network in tests)

## Expense ratios
- N-PORT has none. For the MVP, use `data/expense_ratios.csv` (series_id, class_id, ticker, net_expense_ratio, source_url, as_of), entered by hand from prospectuses
- Pick one class per fund (the lowest-fee class that is open to retail investors) and state that on the fund page