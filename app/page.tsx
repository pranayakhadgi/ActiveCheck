import Link from "next/link";

import { FundSearch } from "@/components/fund-search";
import { ProofSheet } from "@/components/proof-sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getHeroProof } from "@/lib/hero-proof";
import { listFunds } from "@/lib/queries";

const STEPS = [
  {
    n: 1,
    title: "Compare equity holdings",
    body: "We read the fund's latest N-PORT filing from SEC EDGAR, keep only the common stock, and rescale those weights to sum to 100% — on both sides.",
  },
  {
    n: 2,
    title: "Find the closest available index",
    body: "Each holding is matched to the index funds we have loaded, security by security. The closest index is simply the one the fund differs from least.",
  },
  {
    n: 3,
    title: "Translate the fee gap",
    body: "The fee over and above that index fund, divided by the active share, is what the manager's stock-picking actually costs you per year.",
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

      <section aria-labelledby="what-we-measure" className="mt-4 max-w-2xl">
        <h2
          id="what-we-measure"
          className="text-sm font-medium uppercase tracking-wide text-muted-foreground"
        >
          What ActiveCheck measures
        </h2>
        <p className="mt-4 text-base leading-7">
          ActiveCheck shows how much of a fund&rsquo;s fee pays for active stock
          selection rather than market exposure.
        </p>
        <p className="mt-4 text-base leading-7 text-muted-foreground">
          <Term hint="The share of a fund's stock holdings that differs from its closest index. 0% is the index itself; 100% shares nothing with it.">
            Active share
          </Term>{" "}
          is the part of the portfolio that does not look like the index. The{" "}
          <Term hint="The fee gap over the closest index fund, divided by active share: what you pay per year for the part of the portfolio that is not the index.">
            effective active fee
          </Term>{" "}
          prices that part: you could buy the index-like half at the index
          fund&rsquo;s{" "}
          <Term hint="The yearly percentage of your money a fund charges to run itself.">
            expense ratio
          </Term>
          , so the whole fee difference is the price of the rest. Neither number
          says a fund is good or bad — only how different it is, and what that
          difference costs.
        </p>
      </section>

      <section aria-labelledby="how-it-works" className="mt-14">
        <h2
          id="how-it-works"
          className="text-sm font-medium uppercase tracking-wide text-muted-foreground"
        >
          Three steps
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

      {/* The id sits on the section, not on its heading: "Analyze a fund"
          scrolls here, and landing on the section keeps the heading in view
          rather than skipping past it. */}
      <section id="find-a-fund" aria-labelledby="find-a-fund-heading" className="mt-14 scroll-mt-8">
        <h2
          id="find-a-fund-heading"
          className="text-sm font-medium uppercase tracking-wide text-muted-foreground"
        >
          Find a fund
        </h2>
        <div className="mt-4">
          {funds.length === 0 ? (
            <Card>
              <CardContent className="text-sm text-muted-foreground">
                No funds loaded yet. Run{" "}
                <code className="rounded bg-muted px-1 py-0.5">npm run load</code> to load
                the N-PORT fixtures.
              </CardContent>
            </Card>
          ) : (
            <FundSearch funds={funds} />
          )}
        </div>
      </section>

      <section aria-labelledby="limits" className="mt-14 max-w-2xl">
        <h2
          id="limits"
          className="text-sm font-medium uppercase tracking-wide text-muted-foreground"
        >
          Data and limitations
        </h2>
        <ul className="mt-4 space-y-3 text-base leading-7 text-muted-foreground">
          <li>
            Every number comes from public SEC N-PORT filings, and carries the
            report period it was filed for. Holdings are as of that date, not
            today.
          </li>
          <li>
            Index funds stand in for the indexes themselves, so they bring their
            own small cash drag and tracking differences.
          </li>
          <li>
            Cash, debt, derivatives and preferred shares are excluded and the
            remaining stock weights rescaled; the excluded share is shown on
            every fund page.
          </li>
          <li>
            Securities are matched by CUSIP, then ISIN, then a normalized name.
            The matched and unmatched percentages are shown, never hidden.
          </li>
          <li>
            Expense ratios are currently unverified placeholders, so any
            effective active fee should be read as illustrative.
          </li>
          <li>
            ActiveCheck is a research tool, not investment advice, and says
            nothing about future performance.
          </li>
        </ul>
        <p className="mt-4 text-base leading-7">
          <Link href="/methodology" className="text-[var(--color-link)] hover:underline">
            Read the full methodology
          </Link>
          .
        </p>
      </section>

      {/* One closing action, the same one as the hero: the page ends by
          sending the reader to the combobox rather than to a new idea. */}
      <section aria-labelledby="start" className="mt-14">
        <Separator />
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <h2 id="start" className="max-w-xl text-lg leading-8">
            Look up a fund and see what its stock-picking costs.
          </h2>
          <Button asChild size="lg">
            <a href="#find-a-fund">Analyze a fund</a>
          </Button>
        </div>
      </section>
    </main>
  );
}

/** A jargon term with its one-sentence definition, per DESIGN.md's tooltip rule. */
function Term({ hint, children }: { hint: string; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger className="text-foreground underline decoration-dotted underline-offset-4">
        {children}
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{hint}</TooltipContent>
    </Tooltip>
  );
}
