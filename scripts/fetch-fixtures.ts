/**
 * Downloads the most recent NPORT-P primary_doc.xml for each fixture fund
 * into fixtures/nport/<TICKER>.xml. Safe to re-run: a file that already
 * exists is left alone unless --force is passed.
 *
 * Usage: npx tsx scripts/fetch-fixtures.ts [--force] [TICKER ...]
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { archiveDocUrl, edgarGet, seriesFilingsUrl } from "../lib/edgar/client";

type Fixture = { ticker: string; cik: string; seriesId: string; label: string };

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

/**
 * Newest NPORT-P accession number for a series. Amendments (NPORT-P/A) are
 * skipped: the MVP loader treats an amendment as a delete-and-replace of the
 * original, which is a loader concern, not a fixture concern.
 */
function latestAccession(atom: string): string | null {
  const entries = atom.split("<entry>").slice(1);
  for (const entry of entries) {
    const type = /<filing-type>([^<]+)<\/filing-type>/.exec(entry)?.[1]?.trim();
    const accession = /<accession-number>([^<]+)<\/accession-number>/.exec(entry)?.[1]?.trim();
    if (type === "NPORT-P" && accession) return accession;
  }
  return null;
}

async function exists(file: string): Promise<boolean> {
  try {
    await readFile(file);
    return true;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const only = args.filter((a) => !a.startsWith("--")).map((a) => a.toUpperCase());
  const targets = only.length ? FIXTURES.filter((f) => only.includes(f.ticker)) : FIXTURES;

  if (!targets.length) throw new Error(`No fixture matches ${only.join(", ")}`);
  await mkdir(FIXTURE_DIR, { recursive: true });

  for (const fixture of targets) {
    const file = path.join(FIXTURE_DIR, `${fixture.ticker}.xml`);
    if (!force && (await exists(file))) {
      console.log(`${fixture.ticker}: cached, skipping`);
      continue;
    }

    const atom = await edgarGet(seriesFilingsUrl(fixture.seriesId, "NPORT-P"));
    const accession = latestAccession(atom);
    if (!accession) throw new Error(`${fixture.ticker}: no NPORT-P filing found for ${fixture.seriesId}`);

    const url = archiveDocUrl(fixture.cik, accession, "primary_doc.xml");
    const xml = await edgarGet(url);
    await writeFile(file, xml, "utf8");
    console.log(`${fixture.ticker}: ${accession} -> fixtures/nport/${fixture.ticker}.xml (${xml.length} bytes)`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
