/**
 * Downloads the most recent NPORT-P primary_doc.xml for each fixture fund
 * into fixtures/nport/<TICKER>.xml, and records the provenance of every
 * fixture in fixtures/nport/manifest.json. Safe to re-run: a file that
 * already exists is left alone unless --force is passed.
 *
 * Usage: npx tsx scripts/fetch-fixtures.ts [--force] [TICKER ...]
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { archiveDocUrl, edgarGet, seriesFilingsUrl } from "../lib/edgar/client";
import { parseNport } from "../lib/nport/parse";

type Fixture = { ticker: string; cik: string; seriesId: string; label: string };

/**
 * One fixture's provenance. The XML itself carries no accession number, so
 * the loader — which dedupes on exactly that — reads it from here instead of
 * inventing a key from the filename.
 */
export type ManifestEntry = {
  ticker: string;
  cik: string;
  seriesId: string;
  /** Series name as filed, from genInfo/seriesName. */
  name: string;
  file: string;
  accessionNo: string;
  /** EDGAR filing date, YYYY-MM-DD. */
  filedAt: string;
  /** repPdDate of the fixture on disk — the holdings as-of date. */
  reportDate: string;
  sourceUrl: string;
};

// CIK / series / class resolved from https://www.sec.gov/files/company_tickers_mf.json
const FIXTURES: Fixture[] = [
  { ticker: "IVV", cik: "1100663", seriesId: "S000004310", label: "iShares Core S&P 500 ETF (index)" },
  { ticker: "IVW", cik: "1100663", seriesId: "S000004311", label: "iShares S&P 500 Growth ETF (index)" },
  { ticker: "IVE", cik: "1100663", seriesId: "S000004312", label: "iShares S&P 500 Value ETF (index)" },
  { ticker: "FCNTX", cik: "24238", seriesId: "S000006037", label: "Fidelity Contrafund (active)" },
  { ticker: "TRBCX", cik: "902259", seriesId: "S000002069", label: "T. Rowe Price Blue Chip Growth (active)" },
  { ticker: "DODGX", cik: "29440", seriesId: "S000011202", label: "Dodge & Cox Stock Fund (active)" },
];

const FIXTURE_DIR = path.join(process.cwd(), "fixtures", "nport");
const MANIFEST = path.join(FIXTURE_DIR, "manifest.json");

/** One NPORT-P entry from the per-series atom feed, newest first. */
type AtomEntry = { accessionNo: string; filedAt: string };

/**
 * Every NPORT-P filing for a series, newest first. Amendments (NPORT-P/A) are
 * skipped: the MVP loader treats an amendment as a delete-and-replace of the
 * original, which is a loader concern, not a fixture concern.
 */
function nportFilings(atom: string): AtomEntry[] {
  const entries: AtomEntry[] = [];
  for (const entry of atom.split("<entry>").slice(1)) {
    const type = /<filing-type>([^<]+)<\/filing-type>/.exec(entry)?.[1]?.trim();
    const accessionNo = /<accession-number>([^<]+)<\/accession-number>/.exec(entry)?.[1]?.trim();
    const filedAt = /<filing-date>([^<]+)<\/filing-date>/.exec(entry)?.[1]?.trim();
    if (type === "NPORT-P" && accessionNo && filedAt) entries.push({ accessionNo, filedAt });
  }
  return entries;
}

/** Series name as filed; the manifest carries it so the loader needs no second source. */
function seriesName(xml: string): string {
  return /<seriesName>([^<]*)<\/seriesName>/
    .exec(xml)?.[1]
    ?.replace(/&amp;/g, "&")
    .trim() ?? "";
}

async function readIfPresent(file: string): Promise<string | null> {
  try {
    return await readFile(file, "utf8");
  } catch {
    return null;
  }
}

/**
 * The filing in `filings` whose primary_doc.xml reports `reportDate`, or null.
 * Searches newest-first and stops at the first hit, so the usual case costs one
 * request.
 */
async function resolveByReportDate(
  fixture: Fixture,
  filings: readonly AtomEntry[],
  reportDate: string,
): Promise<AtomEntry | null> {
  for (const filing of filings) {
    const url = archiveDocUrl(fixture.cik, filing.accessionNo, "primary_doc.xml");
    if (parseNport(await edgarGet(url)).reportDate === reportDate) return filing;
  }
  return null;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const only = args.filter((a) => !a.startsWith("--")).map((a) => a.toUpperCase());
  const targets = only.length ? FIXTURES.filter((f) => only.includes(f.ticker)) : FIXTURES;

  if (!targets.length) throw new Error(`No fixture matches ${only.join(", ")}`);
  await mkdir(FIXTURE_DIR, { recursive: true });

  const existing: ManifestEntry[] = JSON.parse((await readIfPresent(MANIFEST)) ?? "[]");
  const manifest = new Map(existing.map((entry) => [entry.ticker, entry]));

  for (const fixture of targets) {
    const file = path.join(FIXTURE_DIR, `${fixture.ticker}.xml`);
    const cached = force ? null : await readIfPresent(file);

    const filings = nportFilings(await edgarGet(seriesFilingsUrl(fixture.seriesId, "NPORT-P")));
    if (!filings.length) {
      throw new Error(`${fixture.ticker}: no NPORT-P filing found for ${fixture.seriesId}`);
    }

    let xml = cached;
    let filing = filings[0];

    if (xml === null) {
      xml = await edgarGet(archiveDocUrl(fixture.cik, filing.accessionNo, "primary_doc.xml"));
      await writeFile(file, xml, "utf8");
      console.log(
        `${fixture.ticker}: ${filing.accessionNo} -> fixtures/nport/${fixture.ticker}.xml (${xml.length} bytes)`,
      );
    } else {
      // The accession number is the loader's dedupe key, so a cached fixture may
      // only claim the filing it really is. A newer NPORT-P may have landed since
      // the download, so walk the feed newest-first and take the filing whose
      // holdings date matches the file on disk rather than assuming the newest.
      const cachedDate = parseNport(xml).reportDate;
      const resolved = await resolveByReportDate(fixture, filings, cachedDate);
      if (!resolved) {
        throw new Error(
          `${fixture.ticker}: no NPORT-P in the feed reports ${cachedDate}; ` +
            `the fixture is older than the feed window. Re-run with --force to refresh it.`,
        );
      }
      filing = resolved;
      console.log(`${fixture.ticker}: cached, resolved to ${filing.accessionNo} (${cachedDate})`);
    }

    manifest.set(fixture.ticker, {
      ticker: fixture.ticker,
      cik: fixture.cik,
      seriesId: fixture.seriesId,
      name: seriesName(xml),
      file: `${fixture.ticker}.xml`,
      accessionNo: filing.accessionNo,
      filedAt: filing.filedAt,
      reportDate: parseNport(xml).reportDate,
      sourceUrl: archiveDocUrl(fixture.cik, filing.accessionNo, "primary_doc.xml"),
    });
  }

  const ordered = FIXTURES.map((f) => manifest.get(f.ticker)).filter(
    (entry): entry is ManifestEntry => entry !== undefined,
  );
  await writeFile(MANIFEST, `${JSON.stringify(ordered, null, 2)}\n`, "utf8");
  console.log(`manifest: ${ordered.length} fixture(s) -> fixtures/nport/manifest.json`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
