Below is a build-oriented answer using SEC-hosted sources where I could verify them. Where the requested “current” filing, identifier, or fee could not be directly verified from an official source in this lookup, I mark it **unverified** rather than infer it.

## 1. EDGAR URL patterns and IVV example

### A. Registrant filing-history JSON

SEC’s submissions API pattern is:

```text
https://data.sec.gov/submissions/CIK##########.json
```

Replace `##########` with the **10-digit, zero-padded CIK**. SEC says this endpoint provides a filer’s current filing history, and the JSON is updated throughout the day as filings disseminate. [SEC API documentation](https://www.sec.gov/search-filings/edgar-application-programming-interfaces) [sec](https://www.sec.gov/search-filings/edgar-application-programming-interfaces)

For iShares Trust, the registrant of IVV:

```text
https://data.sec.gov/submissions/CIK0001100663.json
```

iShares Trust’s CIK is `0001100663`. [SEC submissions JSON](https://data.sec.gov/submissions/CIK0001100663.json) [data.sec](https://data.sec.gov/submissions/CIK0001100663.json)

### B. N-PORT holdings XML

For a specific filing, use the EDGAR Archives pattern:

```text
https://www.sec.gov/Archives/edgar/data/{CIK-without-leading-zeroes}/{accession-without-hyphens}/primary_doc.xml
```

For example, if the filing accession is `0000940400-26-007528` for iShares Trust CIK `0001100663`, the direct XML URL is:

```text
https://www.sec.gov/Archives/edgar/data/1100663/000094040026007528/primary_doc.xml
```

The filing’s SEC index page lists `primary_doc.xml` as the NPORT-P document. [SEC filing index](https://www.sec.gov/Archives/edgar/data/1100663/000094040026007528/0000940400-26-007528-index.htm) [sec](https://www.sec.gov/Archives/edgar/data/1100663/000094040026007528/0000940400-26-007528-index.htm)

### IVV worked example

| Item | Verified value |
|---|---|
| Fund | iShares Core S&P 500 ETF (`IVV`) [SEC filing](https://www.sec.gov/Archives/edgar/data/1100663/000119312526327930/0001193125-26-327930-index.html)  [sec](https://www.sec.gov/Archives/edgar/data/1100663/000119312526327930/0001193125-26-327930-index.html) |
| Registrant | iShares Trust [SEC submissions JSON](https://data.sec.gov/submissions/CIK0001100663.json)  [data.sec](https://data.sec.gov/submissions/CIK0001100663.json) |
| Registrant CIK | `0001100663` [SEC submissions JSON](https://data.sec.gov/submissions/CIK0001100663.json)  [data.sec](https://data.sec.gov/submissions/CIK0001100663.json) |
| IVV series ID | `S000004310` [SEC filing](https://www.sec.gov/Archives/edgar/data/1100663/000119312526327930/0001193125-26-327930-index.html)  [sec](https://www.sec.gov/Archives/edgar/data/1100663/000119312526327930/0001193125-26-327930-index.html) |
| IVV class/contract ID | `C000012040` [SEC filing](https://www.sec.gov/Archives/edgar/data/1100663/000119312526327930/0001193125-26-327930-index.html)  [sec](https://www.sec.gov/Archives/edgar/data/1100663/000119312526327930/0001193125-26-327930-index.html) |
| Most recent IVV NPORT-P primary_doc.xml at this lookup | **unverified** |
| Most recent IVV NPORT-P report period at this lookup | **unverified** |

The cited IVV filing confirms the registrant, series, and class ID, but it is a Form 497K prospectus filing—not an NPORT-P filing—so it cannot establish IVV’s most recent N-PORT XML. [SEC filing](https://www.sec.gov/Archives/edgar/data/1100663/000119312526327930/0001193125-26-327930-index.html) [sec](https://www.sec.gov/Archives/edgar/data/1100663/000119312526327930/0001193125-26-327930-index.html)

### Recommended resolver workflow

Do not hard-code an accession number as “most recent.” Instead:

1. Fetch the registrant’s submissions JSON.
2. Filter its recent and historical filing arrays for `form == "NPORT-P"` or, if you explicitly elect to include amendments, `form in {"NPORT-P", "NPORT-P/A"}`.
3. Resolve the filing to a specific **series ID** by opening its filing index page or XML and checking `seriesId`.
4. Sort by the filing’s reported period—not merely filing date—using `<repPdDate>`.
5. Build the archive URL from the selected filing’s accession number and use `primary_doc.xml`.

SEC notes that its submissions JSON includes the current filing history and points to additional historical JSON files when needed. [SEC API documentation](https://www.sec.gov/search-filings/edgar-application-programming-interfaces) [sec](https://www.sec.gov/search-filings/edgar-application-programming-interfaces)

## 2. Benchmark identifiers

All three requested benchmark ETFs are series of iShares Trust, whose CIK is `0001100663`. [SEC submissions JSON](https://data.sec.gov/submissions/CIK0001100663.json) [data.sec](https://data.sec.gov/submissions/CIK0001100663.json)

| Benchmark role | ETF | Registrant CIK | Series ID | Latest NPORT-P XML / report period verified in this lookup |
|---|---:|---:|---:|---|
| S&P 500 | IVV | `0001100663` [SEC filing](https://www.sec.gov/Archives/edgar/data/1100663/000119312526327930/0001193125-26-327930-index.html)  [sec](https://www.sec.gov/Archives/edgar/data/1100663/000119312526327930/0001193125-26-327930-index.html) | `S000004310` [SEC filing](https://www.sec.gov/Archives/edgar/data/1100663/000119312526327930/0001193125-26-327930-index.html)  [sec](https://www.sec.gov/Archives/edgar/data/1100663/000119312526327930/0001193125-26-327930-index.html) | **unverified** |
| S&P 500 Growth | IVW | `0001100663` [SEC N-PORT filing](https://www.sec.gov/Archives/edgar/data/1100663/000094040026007528/0000940400-26-007528-index.htm)  [sec](https://www.sec.gov/Archives/edgar/data/1100663/000094040026007528/0000940400-26-007528-index.htm) | `S000004311` [SEC N-PORT filing](https://www.sec.gov/Archives/edgar/data/1100663/000094040026007528/0000940400-26-007528-index.htm)  [sec](https://www.sec.gov/Archives/edgar/data/1100663/000094040026007528/0000940400-26-007528-index.htm) | [XML](https://www.sec.gov/Archives/edgar/data/1100663/000094040026007528/primary_doc.xml), report period `2025-12-31`; filed `2026-02-25`. [SEC filing index](https://www.sec.gov/Archives/edgar/data/1100663/000094040026007528/0000940400-26-007528-index.htm)  [sec](https://www.sec.gov/Archives/edgar/data/1100663/000094040026007528/0000940400-26-007528-index.htm) |
| S&P 500 Value | IVE | `0001100663` [SEC filing index](https://www.sec.gov/Archives/edgar/data/1100663/000141036826035154/0001410368-26-035154-index.htm)  [sec](https://www.sec.gov/Archives/edgar/data/1100663/000094040026035154/0000940400-26-035154-index.htm) | `S000004312` [SEC filing index](https://www.sec.gov/Archives/edgar/data/1100663/000141036826035154/0001410368-26-035154-index.htm)  [sec](https://www.sec.gov/Archives/edgar/data/1100663/000094040026035154/0000940400-26-035154-index.htm) | [XML](https://www.sec.gov/Archives/edgar/data/1100663/000141036826035154/primary_doc.xml), report period **unverified**; the SEC search result identifies the filing as an NPORT-P and lists `primary_doc.xml`. [SEC filing index](https://www.sec.gov/Archives/edgar/data/1100663/000141036826035154/0001410368-26-035154-index.htm)  [sec](https://www.sec.gov/Archives/edgar/data/1100663/000094040026035154/0000940400-26-035154-index.htm) |

IVW’s cited NPORT-P report covers `2025-12-31`; its XML separately shows `<repPdEnd>2026-03-31</repPdEnd>` and `<repPdDate>2025-12-31</repPdDate>`. For portfolio overlap / active-share date matching, use `<repPdDate>` as the holdings-as-of date. [IVW N-PORT XML](https://www.sec.gov/Archives/edgar/data/1100663/000094040026007528/primary_doc.xml) [sec](https://www.sec.gov/Archives/edgar/data/1100663/000094040026007528/primary_doc.xml)

I could not verify, from the official pages successfully retrieved, whether IVV, IVW, or IVE is legally organized as a UIT. However, each appears as a series of iShares Trust in SEC series/class data; IVW and IVE also have publicly listed NPORT-P filing records, so no substitute is necessary for those two. [IVW N-PORT filing](https://www.sec.gov/Archives/edgar/data/1100663/000094040026007528/0000940400-26-007528-index.htm)  [IVE N-PORT filing](https://www.sec.gov/Archives/edgar/data/1100663/000141036826035154/0001410368-26-035154-index.htm) [sec](https://www.sec.gov/Archives/edgar/data/1100663/000094040026007528/0000940400-26-007528-index.htm)

## 3. N-PORT XML fields

The official SEC N-PORT XML technical-specification landing page explains that N-PORT XML must conform to the SEC’s N-PORT submission taxonomy, which consists of XML Schema Definition files. [SEC N-PORT XML specification](https://www.sec.gov/info/edgar/specifications/form-n-port-xml-tech-specs.htm) [sec](https://www.sec.gov/info/edgar/specifications/form-n-port-xml-tech-specs.htm)

The direct official SEC technical-specification page is:

- [Form N-PORT XML Technical Specification, Version 1.7](https://www.sec.gov/info/edgar/specifications/form-n-port-xml-tech-specs.htm) [sec](https://www.sec.gov/info/edgar/specifications/form-n-port-xml-tech-specs.htm)
- [SEC technical specifications hub](https://www.sec.gov/submit-filings/technical-specifications) [sec](https://www.sec.gov/submit-filings/technical-specifications)

The current working N-PORT document structure is visible directly in the IVW filing XML below. [IVW N-PORT XML](https://www.sec.gov/Archives/edgar/data/1100663/000094040026007528/primary_doc.xml) [sec](https://www.sec.gov/Archives/edgar/data/1100663/000094040026007528/primary_doc.xml)

| Requested item | XML location / element | Notes |
|---|---|---|
| Series ID | `/edgarSubmission/headerData/filerInfo/seriesClassInfo/seriesId` and `/edgarSubmission/formData/genInfo/seriesId` | Both forms appear in the IVW filing. [XML](https://www.sec.gov/Archives/edgar/data/1100663/000094040026007528/primary_doc.xml)  [sec](https://www.sec.gov/Archives/edgar/data/1100663/000094040026007528/primary_doc.xml) |
| Report period date | `/edgarSubmission/formData/genInfo/repPdDate` | This is the as-of holdings date; IVW’s cited filing shows `2025-12-31`. [XML](https://www.sec.gov/Archives/edgar/data/1100663/000094040026007528/primary_doc.xml)  [sec](https://www.sec.gov/Archives/edgar/data/1100663/000094040026007528/primary_doc.xml) |
| Report period end | `/edgarSubmission/formData/genInfo/repPdEnd` | Distinct from `repPdDate`; IVW’s cited filing shows `2026-03-31`. [XML](https://www.sec.gov/Archives/edgar/data/1100663/000094040026007528/primary_doc.xml)  [sec](https://www.sec.gov/Archives/edgar/data/1100663/000094040026007528/primary_doc.xml) |
| Net assets | `/edgarSubmission/formData/fundInfo/netAssets` | IVW’s filing shows `66563860642.67`. [XML](https://www.sec.gov/Archives/edgar/data/1100663/000094040026007528/primary_doc.xml)  [sec](https://www.sec.gov/Archives/edgar/data/1100663/000094040026007528/primary_doc.xml) |
| Holding record | `/edgarSubmission/formData/invstOrSecs/invstOrSec` | Each `<invstOrSec>` is an investment/security record. [XML](https://www.sec.gov/Archives/edgar/data/1100663/000094040026007528/primary_doc.xml)  [sec](https://www.sec.gov/Archives/edgar/data/1100663/000094040026007528/primary_doc.xml) |
| Holding issuer/name | `.../invstOrSec/name` | Example: `RTX Corp`. [XML](https://www.sec.gov/Archives/edgar/data/1100663/000094040026007528/primary_doc.xml)  [sec](https://www.sec.gov/Archives/edgar/data/1100663/000094040026007528/primary_doc.xml) |
| Security title | `.../invstOrSec/title` | This may be more specific than issuer name for instruments. [XML](https://www.sec.gov/Archives/edgar/data/1100663/000094040026007528/primary_doc.xml)  [sec](https://www.sec.gov/Archives/edgar/data/1100663/000094040026007528/primary_doc.xml) |
| CUSIP | `.../invstOrSec/cusip` | Example: RTX CUSIP `75513E101`. [XML](https://www.sec.gov/Archives/edgar/data/1100663/000094040026007528/primary_doc.xml)  [sec](https://www.sec.gov/Archives/edgar/data/1100663/000094040026007528/primary_doc.xml) |
| ISIN | `.../invstOrSec/identifiers/isin[@value]` | The `isin` value is an XML attribute, not element text; example `US75513E1010`. [XML](https://www.sec.gov/Archives/edgar/data/1100663/000094040026007528/primary_doc.xml)  [sec](https://www.sec.gov/Archives/edgar/data/1100663/000094040026007528/primary_doc.xml) |
| Value in U.S. dollars | `.../invstOrSec/valUSD` | Example: RTX value `523696132.40000000`. [XML](https://www.sec.gov/Archives/edgar/data/1100663/000094040026007528/primary_doc.xml)  [sec](https://www.sec.gov/Archives/edgar/data/1100663/000094040026007528/primary_doc.xml) |
| Percent of net assets | `.../invstOrSec/pctVal` | Values are decimal percentages, e.g. `0.786757449678` for RTX, so display conversion to percent requires multiplying by 100. [XML](https://www.sec.gov/Archives/edgar/data/1100663/000094040026007528/primary_doc.xml)  [sec](https://www.sec.gov/Archives/edgar/data/1100663/000094040026007528/primary_doc.xml) |
| Asset category | `.../invstOrSec/assetCat` | Example codes in the filing include `EC`, `DE`, and `STIV`; exact code interpretation should be implemented from the SEC taxonomy/specification rather than guessed. [XML](https://www.sec.gov/Archives/edgar/data/1100663/000094040026007528/primary_doc.xml)  [sec](https://www.sec.gov/Archives/edgar/data/1100663/000094040026007528/primary_doc.xml) |
| Payoff profile | `.../invstOrSec/payoffProfile` | For non-derivative holdings, examples include `Long`; a derivative’s additional payoff profile appears as `.../derivativeInfo/*/payOffProf`. [XML](https://www.sec.gov/Archives/edgar/data/1100663/000094040026007528/primary_doc.xml)  [sec](https://www.sec.gov/Archives/edgar/data/1100663/000094040026007528/primary_doc.xml) |

### Important active-share implementation note

For a long-only equity comparison, a practical data pipeline should normally:

- identify securities by a stable identifier, preferring `isin` where present and otherwise `cusip`;
- aggregate multiple lines for the same security before comparing weights;
- use `pctVal` or calculate each holding’s portfolio weight as `valUSD / netAssets`;
- define an explicit treatment for cash, derivatives, foreign listings, depositary receipts, options, futures, and securities with missing/non-standard identifiers.

The first three bullets are directly supported by the N-PORT field structure above; the last is methodology design advice, not an SEC requirement. [IVW N-PORT XML](https://www.sec.gov/Archives/edgar/data/1100663/000094040026007528/primary_doc.xml) [sec](https://www.sec.gov/Archives/edgar/data/1100663/000094040026007528/primary_doc.xml)

## 4. Free official expense-ratio source

The best **free, official, bulk-downloadable source for prospectus-disclosed, share-class-level fee data** is the SEC’s **Mutual Fund Prospectus Risk/Return Summary Data Sets**. The data are extracted from XBRL-tagged exhibits to mutual-fund prospectuses and are presented in flattened form. [SEC MFRR data page](https://www.sec.gov/data-research/sec-markets-data/mutual-fund-prospectus-riskreturn-summary-data-sets) [sec](https://www.sec.gov/data-research/sec-markets-data/mutual-fund-prospectus-riskreturn-summary-data-sets)

| Item | Answer |
|---|---|
| Official data page | [SEC Mutual Fund Prospectus Risk/Return Summary Data Sets](https://www.sec.gov/data-research/sec-markets-data/mutual-fund-prospectus-riskreturn-summary-data-sets)  [sec](https://www.sec.gov/data-research/sec-markets-data/mutual-fund-prospectus-riskreturn-summary-data-sets) |
| Latest download shown by the page retrieved | [2025 Q2 MFRR ZIP](https://www.sec.gov/files/dera/data/mutual-fund-prospectus-risk-return-summary-data-sets/2025q2_mfrr.zip) — **unverified** as a direct URL because the SEC page text exposed the download label but not the target URL in this lookup. The authoritative download table is on the [SEC data page](https://www.sec.gov/data-research/sec-markets-data/mutual-fund-prospectus-riskreturn-summary-data-sets).  [sec](https://www.sec.gov/data-research/sec-markets-data/mutual-fund-prospectus-riskreturn-summary-data-sets) |
| Update frequency | Quarterly. Filings submitted after 5:30 p.m. Eastern on the last business day of a quarter roll into the subsequent posting. [SEC MFRR data page](https://www.sec.gov/data-research/sec-markets-data/mutual-fund-prospectus-riskreturn-summary-data-sets)  [sec](https://www.sec.gov/data-research/sec-markets-data/mutual-fund-prospectus-riskreturn-summary-data-sets) |
| Data coverage caveat | It is prospectus/as-filed data, not a guaranteed current fee feed; the SEC explicitly says the data are derived from registrant submissions, may contain inaccuracies, and are not a substitute for reviewing filings. [SEC MFRR data page](https://www.sec.gov/data-research/sec-markets-data/mutual-fund-prospectus-riskreturn-summary-data-sets)  [sec](https://www.sec.gov/data-research/sec-markets-data/mutual-fund-prospectus-riskreturn-summary-data-sets) |
| Net expense-ratio field | **unverified** from the official documentation retrieved. Do not assume a column label such as `net_expense_ratio`; download the SEC MFRR documentation ZIP/PDF and use the table definition supplied for that release. [SEC MFRR data page](https://www.sec.gov/data-research/sec-markets-data/mutual-fund-prospectus-riskreturn-summary-data-sets)  [sec](https://www.sec.gov/data-research/sec-markets-data/mutual-fund-prospectus-riskreturn-summary-data-sets) |

For your use case, retain these dimensions with each fee observation: registrant CIK, series ID, class/contract ID, ticker if supplied, prospectus filing accession/date, and the fee-waiver/expense-reimbursement context. This is necessary because expense ratios are share-class-specific and prospectus disclosures are dated. The SEC source is explicitly based on as-filed prospectus information. [SEC MFRR data page](https://www.sec.gov/data-research/sec-markets-data/mutual-fund-prospectus-riskreturn-summary-data-sets) [sec](https://www.sec.gov/data-research/sec-markets-data/mutual-fund-prospectus-riskreturn-summary-data-sets)

I would **not** use N-CSR tailored-shareholder-report XBRL as the primary cross-fund current net-expense-ratio source without a separately verified taxonomy/data dictionary. **Unverified** from the retrieved official materials that it provides a uniform, current, per-share-class “net expense ratio” field suitable for your stated universe.

## 5. Five active large-cap funds

I cannot responsibly supply the requested five-fund table—including verified CIK, series ID, lowest-fee retail ticker, and **current** prospectus net expense ratio—because this lookup did not retrieve the necessary current SEC prospectus filings and XBRL records for each candidate. The requested values are therefore **unverified**.

A safe production approach is:

1. Define the eligible active large-cap universe independently and reproducibly, including whether “large-cap” uses a prospectus category, Morningstar category, stated benchmark, or holdings-derived market-cap rule.
2. Resolve each fund’s series and share classes from its latest EDGAR N-1A/497 filing.
3. Extract the latest disclosed net expense ratio for each retail class from the prospectus risk/return XBRL / MFRR data.
4. Identify the lowest-fee **retail** class by an explicit retail-class rule; do not automatically select institutional, advisor, retirement, or load-waived classes.
5. Save accession number, effective date, and any fee-waiver expiration alongside the ratio.

The SEC’s MFRR dataset supports prospectus-derived fee analysis but should be paired with the full filing for validation, per the SEC’s own disclaimer. [SEC MFRR data page](https://www.sec.gov/data-research/sec-markets-data/mutual-fund-prospectus-riskreturn-summary-data-sets) [sec](https://www.sec.gov/data-research/sec-markets-data/mutual-fund-prospectus-riskreturn-summary-data-sets)

## 6. Active Share and closet-index thresholds

Cremers and Petajisto define **Active Share** as the fraction of a fund’s holdings that differ from the benchmark’s holdings. [Cremers & Petajisto working-paper PDF](https://depot.som.yale.edu/icf/papers/fileuploads/2370/original/06-14.pdf) [depot.som.yale](https://depot.som.yale.edu/icf/papers/fileuploads/2370/original/06-14.pdf)

For fund \(f\) and benchmark \(b\), with matched security weights \(w_{f,i}\) and \(w_{b,i}\), the standard formula is:

\[
\operatorname{Active\ Share}
= \frac{1}{2}\sum_i \left|w_{f,i}-w_{b,i}\right|
\]

Equivalently, provided the weights are on comparable full-portfolio bases:

\[
\operatorname{Active\ Share}
= 1-\sum_i\min(w_{f,i},w_{b,i})
\]

The “share of holdings that differ from the benchmark” description is stated in the paper; the formula is the mathematical implementation of that definition. [Cremers & Petajisto working-paper PDF](https://depot.som.yale.edu/icf/papers/fileuploads/2370/original/06-14.pdf) [depot.som.yale](https://depot.som.yale.edu/icf/papers/fileuploads/2370/original/06-14.pdf)

| Label | Active Share threshold |
|---|---|
| Closet indexer | Between 20% and 60% Active Share in the paper’s description of low-active-share funds. [Cremers & Petajisto working-paper PDF](https://depot.som.yale.edu/icf/papers/fileuploads/2370/original/06-14.pdf)  [depot.som.yale](https://depot.som.yale.edu/icf/papers/fileuploads/2370/original/06-14.pdf) |
| Common operational cutoff | Active Share below 60% is commonly used to classify a fund as a closet indexer; a later study explicitly attributes that cutoff to Cremers and Petajisto (2009). [S&P DJI study PDF](https://www.spglobal.com/spdji/en/documents/spiva/2013-spiva-matos-cremers-ferreira-starks-mutual-fund-industry.pdf)  [spglobal](https://www.spglobal.com/spdji/en/documents/spiva/2013-spiva-matos-cremers-ferreira-starks-mutual-fund-industry.pdf) |
| High-active category | Active Share greater than 80% is discussed in subsequent summaries of the Cremers–Petajisto results; this is **not** the closet-indexer cutoff. [CBS summary PDF](https://research.cbs.dk/files/60730398/106190_Thesis_Main_vFinal_NoCPR.pdf)  [research.cbs](https://research.cbs.dk/files/60730398/106190_Thesis_Main_vFinal_NoCPR.pdf) |

The 60% cutoff should be a **labeling convention**, not a claim that funds at 59.9% and 60.1% are economically distinct. It is particularly important to avoid comparing an active fund’s full portfolio—including cash and derivatives—with an index fund’s equity-only holdings without first stating a consistent normalization and instrument-treatment rule.

## 7. SEC fair-access rules

SEC’s EDGAR data pages say automated access must comply with SEC.gov’s Privacy and Security Policy, and SEC’s APIs provide structured JSON access through `data.sec.gov`. [SEC EDGAR data-access page](https://www.sec.gov/search-filings/edgar-application-programming-interfaces)  [SEC data-access guidance](https://www.sec.gov/search-filings/edgar-search-assistance/accessing-edgar-data) [sec](https://www.sec.gov/search-filings/edgar-application-programming-interfaces)

| Requirement | Implementation |
|---|---|
| Identify your client | Send a descriptive `User-Agent` header. SEC’s API toolkit says every request should identify the software vendor and version; invalid/missing user agents may produce notices or HTTP 400 responses. [SEC EDGAR API Toolkit](https://api.edgarfiling.sec.gov/docs/index.html)  [api.edgarfiling.sec](https://api.edgarfiling.sec.gov/docs/index.html) |
| Practical User-Agent format | `YourAppName/1.0 contact@yourdomain.example` is a reasonable contactable format, but the exact `name email` grammar is **unverified** from the SEC pages retrieved. The verified requirement is a header identifying vendor and version. [SEC EDGAR API Toolkit](https://api.edgarfiling.sec.gov/docs/index.html)  [api.edgarfiling.sec](https://api.edgarfiling.sec.gov/docs/index.html) |
| Request-rate limit | **10 requests per second maximum: unverified from an official SEC page retrieved in this lookup.** It is widely cited in implementation guidance, but because the requested official SEC fair-access page was not retrieved with that exact text, do not treat this response as verification of that number. |
| Backoff behavior | Use a client-side limiter, honor `429`/`403`/`400` responses, add exponential backoff with jitter, cache response data, and avoid parallel bursts. This is engineering advice, not a quoted SEC rule. |
| SEC pages to monitor | [SEC developer resources](https://www.sec.gov/about/developer-resources), [Accessing EDGAR Data](https://www.sec.gov/search-filings/edgar-search-assistance/accessing-edgar-data), and the [EDGAR API Toolkit](https://api.edgarfiling.sec.gov/docs/index.html).  [sec](https://www.sec.gov/about/developer-resources) |

A conservative Python request setup would be:

```python
headers = {
    "User-Agent": "active-share-research/0.1 pranaya@example.com",
    "Accept-Encoding": "gzip, deflate",
    "Host": "data.sec.gov",
}
```

The presence of a descriptive `User-Agent` that identifies the software is supported by SEC’s API toolkit; the particular application name and contact address in the example are illustrative. [SEC EDGAR API Toolkit](https://api.edgarfiling.sec.gov/docs/index.html) [api.edgarfiling.sec](https://api.edgarfiling.sec.gov/docs/index.html)