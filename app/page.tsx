import Link from "next/link";

import { FundSearch } from "@/components/fund-search";
import { ProofSheet } from "@/components/proof-sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getHeroProof } from "@/lib/hero-proof";
import { listFunds } from "@/lib/queries";

const STEPS = [
  {
    n: 1,
    title: "Read the filing",
    body: "We pull the fund's latest N-PORT holdings from SEC EDGAR and keep the report-period date attached to every number.",
  },
  {
    n: 2,
    title: "Compare to index funds",
    body: "Equity holdings are rescaled to sum to 1, then matched against index funds security by security. The closest index is the one with the lowest active share.",
  },
  {
    n: 3,
    title: "Price the active part",
    body: "The fee gap over the index fund, divided by the active share, is what you actually pay for the manager's stock-picking.",
  },
] as const;

export default async function Home() {
  // Two server-side reads, in parallel: the fund list behind the combobox and
  // the one worked example the hero shows. Both come from the stored results
  // `npm run load` wrote, so the page renders a handful of indexed selects.
  const [funds, proof] = await Promise.all([listFunds(), getHeroProof()]);

  return (
    <main className="mx-auto w-full max-w-[960px] px-4 pb-16">
      {/* Editorial, left-aligned, one band. On mobile the single column keeps
          the brand's required order: headline, support, CTAs, provenance, then
          the proof element — which never shrinks into decoration. */}
      <section
        aria-labelledby="hero-headline"
        className="grid grid-cols-1 items-start gap-10 py-16 lg:grid-cols-12 lg:py-20"
      >
        <div className="lg:col-span-6">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Built from public SEC N-PORT filings
          </p>
          <h1
            id="hero-headline"
            className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl"
          >
            See what a fund&rsquo;s stock-picking is really costing you.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
            ActiveCheck compares a fund&rsquo;s holdings with available index
            funds, measures active share, and translates the fee difference into
            an effective active fee.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-2">
            <Button asChild size="lg">
              <a href="#find-a-fund">Analyze a fund</a>
            </Button>
            <Button asChild variant="link" size="lg" className="text-[var(--color-link)]">
              <Link href="/methodology">Read the methodology</Link>
            </Button>
          </div>

          <p className="mt-5 text-xs leading-5 text-muted-foreground">
            Public SEC filing data · Report-period aware · Research tool, not
            investment advice
          </p>
        </div>

        <div className="lg:col-span-6">
          <ProofSheet data={proof} />
        </div>
      </section>

      <section aria-labelledby="find-a-fund" className="mt-10">
        <h2 id="find-a-fund" className="sr-only">
          Find a fund
        </h2>
        {funds.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              No funds loaded yet. Run{" "}
              <code className="rounded bg-muted px-1 py-0.5">npm run load</code> to load the
              N-PORT fixtures.
            </CardContent>
          </Card>
        ) : (
          <FundSearch funds={funds} />
        )}
      </section>

      <section aria-labelledby="how-it-works" className="mt-14">
        <h2
          id="how-it-works"
          className="text-sm font-medium uppercase tracking-wide text-muted-foreground"
        >
          How it works
        </h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-3">
          {STEPS.map((step) => (
            <li key={step.n}>
              <Card className="h-full">
                <CardHeader>
                  <p className="tabular text-sm font-medium text-muted-foreground">
                    Step {step.n}
                  </p>
                  <CardTitle className="text-base">{step.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm leading-6 text-muted-foreground">
                  {step.body}
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="disclaimer" className="mt-14 max-w-2xl">
        <h2 id="disclaimer" className="text-sm font-medium">
          Disclaimer
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          ActiveCheck is an educational tool built on public SEC N-PORT filings.
          It is not investment advice, not a recommendation to buy or sell any
          fund, and index funds are used as stand-ins for the indexes
          themselves. Holdings are as of each filing&rsquo;s report period, not
          today.
        </p>
      </section>
        </main>
  );
}
