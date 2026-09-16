/**
 * Prints what is in the database: a row count per table, and one content
 * digest over every loaded holding, result and weight row.
 *
 * The digest deliberately hashes *content* — tickers, accession numbers, match
 * keys, weights — and never a BIGSERIAL id, because `npm run load` replaces a
 * filing's holdings and results rather than updating them in place, so surrogate
 * ids advance on every run while the data does not. Running the loader twice and
 * seeing the same counts and the same digest is the proof that it is re-runnable.
 *
 * Usage: npm run db:summary
 */
import postgres from "postgres";

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set (put it in .env.local)");

  const sql = postgres(connectionString, { ssl: "require", max: 1 });

  try {
    const counts = await sql<{ table_name: string; rows: string }[]>`
                  SELECT 'funds'          AS table_name, count(*) AS rows FROM funds
        UNION ALL SELECT 'filings',       count(*) FROM filings
        UNION ALL SELECT 'holdings',      count(*) FROM holdings
        UNION ALL SELECT 'results',       count(*) FROM results
        UNION ALL SELECT 'result_weights',count(*) FROM result_weights
        ORDER BY 1
    `;
    for (const row of counts) {
      console.log(`${row.table_name.padEnd(15)} ${row.rows.padStart(6)}`);
    }

    const [digest] = await sql<{ digest: string | null }[]>`
      SELECT md5(string_agg(entry, '|' ORDER BY entry)) AS digest FROM (
        SELECT 'H:' || fu.ticker || ':' || f.accession_no || ':' || f.report_period || ':' ||
               h.match_key || ':' || h.asset_cat || ':' || h.pct_val AS entry
        FROM holdings h
        JOIN filings f ON f.id = h.filing_id
        JOIN funds fu ON fu.id = f.fund_id

        UNION ALL
        SELECT 'R:' || fund.ticker || '>' || bench.ticker || ':' || r.active_share || ':' ||
               coalesce(r.effective_active_fee::text, '-') || ':' || r.is_closest || ':' ||
               r.matched_pct || ':' || r.unmatched_fund_pct || ':' || r.excluded_pct
        FROM results r
        JOIN filings ff ON ff.id = r.filing_id
        JOIN funds fund ON fund.id = ff.fund_id
        JOIN filings bf ON bf.id = r.benchmark_filing_id
        JOIN funds bench ON bench.id = bf.fund_id

        UNION ALL
        SELECT 'W:' || fund.ticker || '>' || bench.ticker || ':' || w.side || ':' || w.rank ||
               ':' || w.match_key || ':' || w.difference
        FROM result_weights w
        JOIN results r ON r.id = w.result_id
        JOIN filings ff ON ff.id = r.filing_id
        JOIN funds fund ON fund.id = ff.fund_id
        JOIN filings bf ON bf.id = r.benchmark_filing_id
        JOIN funds bench ON bench.id = bf.fund_id
      ) entries
    `;
    console.log(`content digest  ${digest.digest ?? "(empty database)"}`);
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
