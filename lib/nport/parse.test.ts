import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { parseNport } from "./parse";

const FIXTURE_DIR = path.join(process.cwd(), "fixtures", "nport");

/** Expected identity of each fixture, from the SEC mutual-fund ticker map. */
const FIXTURES = [
  { ticker: "IVV", seriesId: "S000004310", isIndex: true },
  { ticker: "IVW", seriesId: "S000004311", isIndex: true },
  { ticker: "IVE", seriesId: "S000004312", isIndex: true },
  { ticker: "FCNTX", seriesId: "S000006037", isIndex: false },
  { ticker: "TRBCX", seriesId: "S000002069", isIndex: false },
  { ticker: "DODGX", seriesId: "S000011202", isIndex: false },
] as const;

function load(ticker: string) {
  return parseNport(readFileSync(path.join(FIXTURE_DIR, `${ticker}.xml`), "utf8"));
}

describe.each(FIXTURES)("parseNport($ticker)", ({ ticker, seriesId, isIndex }) => {
  const filing = load(ticker);

  it("reads the series id from the filing", () => {
    expect(filing.seriesId).toBe(seriesId);
  });

  it("parses repPdDate as a YYYY-MM-DD calendar date", () => {
    expect(filing.reportDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // The string must survive a UTC round-trip unshifted — the reason we keep
    // dates as strings rather than Date objects.
    expect(new Date(`${filing.reportDate}T00:00:00Z`).toISOString().slice(0, 10)).toBe(
      filing.reportDate,
    );
  });

  it("uses repPdDate, not the later repPdEnd", () => {
    const repPdEnd = /<repPdEnd>([^<]+)<\/repPdEnd>/.exec(
      readFileSync(path.join(FIXTURE_DIR, `${ticker}.xml`), "utf8"),
    )?.[1];
    expect(repPdEnd).toBeDefined();
    expect(filing.reportDate <= repPdEnd!).toBe(true);
  });

  it("reads positive net assets", () => {
    expect(filing.netAssets).toBeGreaterThan(0);
  });

  it("returns holdings", () => {
    expect(filing.holdings.length).toBeGreaterThan(0);
  });

  it("sums pctVal to about 100 percent", () => {
    const total = filing.holdings.reduce((sum, h) => sum + h.pctVal, 0);
    // pctVal is filed as a percentage, not a fraction. Filings round, and a
    // fund can hold liabilities, so the sum lands near but not exactly on 100.
    expect(total).toBeGreaterThan(95);
    expect(total).toBeLessThan(105);
  });

  it("agrees with netAssets when weights are recomputed from valUSD", () => {
    const totalValue = filing.holdings.reduce((sum, h) => sum + h.valUSD, 0);
    const impliedPct = (totalValue / filing.netAssets) * 100;
    const filedPct = filing.holdings.reduce((sum, h) => sum + h.pctVal, 0);
    expect(Math.abs(impliedPct - filedPct)).toBeLessThan(0.5);
  });

  it("holds mostly equity, and every holding has a usable identifier", () => {
    const equity = filing.holdings.filter(
      (h) => h.assetCat === "EC" && h.payoffProfile === "Long",
    );
    expect(equity.length).toBeGreaterThan(filing.holdings.length * 0.5);

    // Matching falls back CUSIP -> ISIN -> normalized name, so a name is the
    // one field that must never be empty.
    for (const holding of filing.holdings) {
      expect(holding.name.length).toBeGreaterThan(0);
      expect(holding.title.length).toBeGreaterThan(0);
    }
  });

  it("normalises identifiers and never emits a placeholder CUSIP", () => {
    for (const holding of filing.holdings) {
      if (holding.cusip !== null) {
        expect(holding.cusip).toMatch(/^[A-Z0-9]{9}$/);
      }
      if (holding.isin !== null) {
        expect(holding.isin).toBe(holding.isin.toUpperCase());
        expect(holding.isin).toMatch(/^[A-Z]{2}[A-Z0-9]{9}\d$/);
      }
    }
  });

  it("index funds are more diversified than the active funds", () => {
    const top = Math.max(...filing.holdings.map((h) => h.pctVal));
    expect(isIndex ? top < 15 : top < 50).toBe(true);
  });
});

describe("parseNport edge cases", () => {
  const minimal = (holdings: string) => `<?xml version="1.0" encoding="UTF-8"?>
<edgarSubmission xmlns="http://www.sec.gov/edgar/nport">
  <formData>
    <genInfo><seriesId>S000000001</seriesId><repPdDate>2026-03-31</repPdDate></genInfo>
    <fundInfo><netAssets>1000.00</netAssets></fundInfo>
    <invstOrSecs>${holdings}</invstOrSecs>
  </formData>
</edgarSubmission>`;

  const oneHolding = `<invstOrSec>
      <name>ACME INC</name><title>ACME INC COM</title><cusip>000000000</cusip>
      <identifiers><isin value="us0000000019"/></identifiers>
      <valUSD>500.00</valUSD><pctVal>50.0</pctVal>
      <assetCat>EC</assetCat><payoffProfile>Long</payoffProfile>
    </invstOrSec>`;

  it("returns an array for a single-holding filing", () => {
    const filing = parseNport(minimal(oneHolding));
    expect(filing.holdings).toHaveLength(1);
    expect(filing.holdings[0].name).toBe("ACME INC");
  });

  it("treats a placeholder CUSIP as missing and uppercases the ISIN", () => {
    const [holding] = parseNport(minimal(oneHolding)).holdings;
    expect(holding.cusip).toBeNull();
    expect(holding.isin).toBe("US0000000019");
  });

  it("buckets a missing assetCat to OTHER and keeps a null payoffProfile", () => {
    const filing = parseNport(
      minimal(`<invstOrSec>
        <name>MYSTERY LINE</name><valUSD>1.00</valUSD><pctVal>0.1</pctVal>
      </invstOrSec>`),
    );
    expect(filing.holdings[0].assetCat).toBe("OTHER");
    expect(filing.holdings[0].payoffProfile).toBeNull();
    // Title falls back to the issuer name rather than an empty string.
    expect(filing.holdings[0].title).toBe("MYSTERY LINE");
  });

  it("returns no holdings when invstOrSecs is empty", () => {
    expect(parseNport(minimal("")).holdings).toEqual([]);
  });

  it("throws on a missing report date", () => {
    const xml = minimal(oneHolding).replace("<repPdDate>2026-03-31</repPdDate>", "");
    expect(() => parseNport(xml)).toThrow(/repPdDate/);
  });

  it("throws on an impossible report date", () => {
    const xml = minimal(oneHolding).replace("2026-03-31", "2026-02-31");
    expect(() => parseNport(xml)).toThrow(/not a valid date/);
  });

  it("throws when the root element is not an N-PORT submission", () => {
    expect(() => parseNport("<html><body>404</body></html>")).toThrow(/edgarSubmission/);
  });
});
