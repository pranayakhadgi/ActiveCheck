import Link from "next/link";
import { notFound } from "next/navigation";

import { ActiveShareGauge } from "@/components/active-share-gauge";
import { StatTile } from "@/components/stat-tile";
import { WeightTable } from "@/components/weight-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { feePerYear, percent, percentPoints, reportDate } from "@/lib/format";
import { getFundReport, listFundSeriesIds } from "@/lib/queries";
import { CLOSET_INDEXER_ACTIVE_SHARE, verdict } from "@/lib/verdict";

/** Only funds with a loaded filing have a page; anything else 404s. */
export async function generateStaticParams() {
  return (await listFundSeriesIds()).map((seriesId) => ({ seriesId }));
}

export async function generateMetadata({ params }: PageProps<"/fund/[seriesId]">) {
  const { seriesId } = await params;
  const fund = await getFundReport(seriesId);
  if (!fund) return { title: "Fund not found — ActiveCheck" };
  return {
    title: `${fund.name} — ActiveCheck`,
    description: `Active share and effective active fee for ${fund.name}, from its N-PORT filing for ${fund.reportPeriod}.`,
  };
}

export default async function FundPage({ params }: PageProps<"/fund/[seriesId]">) {
  const { seriesId } = await params;
  const fund = await getFundReport(seriesId);
  if (!fund) notFound();

  // The loader guarantees exactly one closest benchmark per filing
  // (results_one_closest_idx), and getFundReport sorts it first.
  const closest = fund.benchmarks[0];
  const asOf = reportDate(fund.reportPeriod);
  const story = verdict(closest.activeShare, closest.effectiveActiveFee, closest.ticker);
  const toneColour = story.tone === "low" ? "var(--signal-low)" : "var(--signal-high)";

  // Fund and benchmark can be filed for different months; say so where the two
  // are actually compared rather than burying it in the data-quality note.
  const periodsDiffer = closest.reportPeriod !== fund.reportPeriod;

  return (
    <main className="mx-auto w-full max-w-[960px] px-4 py-10 sm:py-14">
      <nav className="mb-6 text-sm">
        <Link href="/" className="text-[var(--color-link)] hover:underline">
          ← All funds
        </Link>
      </nav>

      <header>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{fund.name}</h1>
          {fund.isIndex ? <Badge variant="outline">Index fund</Badge> : null}
        </div>
        <p className="tabular mt-2 text-sm text-muted-foreground">
          {fund.ticker ? <span className="font-medium text-foreground">{fund.ticker}</span> : null}
          {fund.ticker ? " · " : ""}
          Series {fund.seriesId} · Data as of {asOf}
        </p>
      </header>

      <section aria-label="Headline figures" className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Active share"
          hint="The share of the fund's stock holdings that differs from its closest index. 0% is the index itself; 100% shares nothing with it."
          asOf={asOf}
          footnote={
            <>
              {story.label} —{" "}
              {story.tone === "low"
                ? `below the ${percent(CLOSET_INDEXER_ACTIVE_SHARE, 0)} convention`
                : `at or above the ${percent(CLOSET_INDEXER_ACTIVE_SHARE, 0)} convention`}
            </>
          }
        >
          <ActiveShareGauge value={closest.activeShare} tone={story.tone} />
        </StatTile>

        <StatTile
          label="Closest index"
          hint="The index fund this fund resembles most, meaning the one it has the lowest active share against."
          asOf={reportDate(closest.reportPeriod)}
          footnote={
            <>
              {closest.name}
              {closest.expenseRatio === null
                ? null
                : ` · ${feePerYear(closest.expenseRatio)} expense ratio`}
            </>
          }
        >
          <p className="tabular text-3xl font-semibold">{closest.ticker}</p>
        </StatTile>

        <StatTile
          label="Effective active fee"
          hint="The fee gap over the closest index fund, divided by active share: what you pay per year for the part of the portfolio that is not the index."
          asOf={asOf}
          footnote={
            fund.expenseRatio === null ? (
              "No expense ratio on file for this fund."
            ) : (
              <>
                {feePerYear(fund.expenseRatio)} fund fee
                {closest.expenseRatio === null
                  ? null
                  : ` − ${feePerYear(closest.expenseRatio)} index fee`}
                {fund.erVerified ? null : " · expense ratio unverified"}
              </>
            )
          }
        >
          <p className="tabular text-3xl font-semibold">
            {closest.effectiveActiveFee === null ? (
              <span className="text-muted-foreground">—</span>
            ) : (
              feePerYear(closest.effectiveActiveFee)
            )}
          </p>
        </StatTile>
      </section>

      <section aria-label="Verdict" className="mt-6">
        <p className="text-lg leading-8" style={{ color: toneColour }}>
          {story.sentence}
        </p>
        {story.caveat ? (
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{story.caveat}</p>
        ) : null}
      </section>

      {/* Stacked, not side by side: at the 960px max width two five-column
          tables clip the difference and its bar, which are the whole point. */}
      <section aria-label="Biggest bets" className="mt-10 space-y-4">
        <WeightTable
          title="Top 10 overweights"
          description={`Held more heavily than ${closest.ticker}.`}
          rows={closest.overweights}
          benchmarkTicker={closest.ticker}
        />
        <WeightTable
          title="Top 10 underweights"
          description={`Held more lightly than ${closest.ticker}, or not at all.`}
          rows={closest.underweights}
          benchmarkTicker={closest.ticker}
        />
      </section>

      <section aria-label="Comparison against each benchmark" className="mt-10">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Against each benchmark</CardTitle>
            <CardDescription>
              The closest index is simply the row with the lowest active share.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Benchmark</TableHead>
                  <TableHead className="text-right">Active share</TableHead>
                  <TableHead className="text-right">Effective active fee</TableHead>
                  <TableHead className="text-right">Data as of</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fund.benchmarks.map((benchmark) => (
                  <TableRow key={benchmark.ticker}>
                    <TableCell>
                      <span className="font-medium">{benchmark.ticker}</span>
                      {benchmark.isClosest ? (
                        <Badge variant="secondary" className="ml-2">
                          Closest
                        </Badge>
                      ) : null}
                      <span className="block text-xs text-muted-foreground">
                        {benchmark.name}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{percent(benchmark.activeShare)}</TableCell>
                    <TableCell className="text-right">
                      {benchmark.effectiveActiveFee === null
                        ? "—"
                        : feePerYear(benchmark.effectiveActiveFee)}
                    </TableCell>
                    <TableCell className="text-right">
                      {reportDate(benchmark.reportPeriod)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      <section aria-label="Data quality" className="mt-10">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Data quality</CardTitle>
            <CardDescription>
              What these numbers are computed from, and what they leave out.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-6">
            <dl className="grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-muted-foreground">Matched to {closest.ticker}</dt>
                <dd className="tabular text-lg font-medium">
                  {percentPoints(closest.matchedPct)}
                </dd>
                <dd className="text-xs text-muted-foreground">
                  {percentPoints(closest.unmatchedFundPct)} of the fund&rsquo;s stock weight
                  has no counterpart in the benchmark and counts as fully active.
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Excluded as non-equity</dt>
                <dd className="tabular text-lg font-medium">
                  {percentPoints(fund.excludedPct)}
                </dd>
                <dd className="text-xs text-muted-foreground">
                  Cash, derivatives, debt and preferred shares are dropped and the
                  remaining stock weights rescaled to sum to 100%.
                  {" "}({percentPoints(closest.benchmarkExcludedPct)} excluded on the{" "}
                  {closest.ticker} side.)
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Filing</dt>
                <dd className="tabular text-lg font-medium">{asOf}</dd>
                <dd className="tabular text-xs text-muted-foreground">
                  {fund.sourceUrl ? (
                    <a
                      href={fund.sourceUrl}
                      className="text-[var(--color-link)] hover:underline"
                      rel="noreferrer"
                    >
                      {fund.accessionNo}
                    </a>
                  ) : (
                    fund.accessionNo
                  )}
                  {fund.filedAt ? ` · filed ${reportDate(fund.filedAt)}` : ""}
                </dd>
              </div>
            </dl>

            {periodsDiffer ? (
              <p className="text-muted-foreground">
                <span className="font-medium text-foreground">Mismatched periods.</span>{" "}
                This fund is filed for {asOf} and {closest.ticker} for{" "}
                {reportDate(closest.reportPeriod)}. Holdings move between those dates, so
                some of the measured difference is timing rather than stock-picking, which
                nudges active share up.
              </p>
            ) : null}

            {fund.erVerified ? null : (
              <p className="text-muted-foreground">
                <span className="font-medium text-foreground">
                  Expense ratio not verified.
                </span>{" "}
                {fund.expenseRatio === null
                  ? "No expense ratio is on file for this fund, so no effective active fee is shown."
                  : `${feePerYear(fund.expenseRatio)} is a placeholder pending a check against the fund's prospectus, so the effective active fee should be read as illustrative.`}
              </p>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
