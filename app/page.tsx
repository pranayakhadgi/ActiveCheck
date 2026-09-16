import { FundSearch } from "@/components/fund-search";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  // A server component reading Postgres directly: the list is small, already
  // carries each fund's headline number, and never needs a client round trip.
  const funds = await listFunds();

  return (
    <main className="mx-auto w-full max-w-[960px] px-4 py-16">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          ActiveCheck
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          How much are you actually paying for your fund manager&rsquo;s
          stock-picking?
        </p>
        <p className="mt-6 text-base leading-7">
          ActiveCheck measures a fund&rsquo;s{" "}
          <Tooltip>
            <TooltipTrigger className="underline decoration-dotted underline-offset-4">
              active share
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              The share of a fund&rsquo;s portfolio that differs from its
              closest index.
            </TooltipContent>
          </Tooltip>{" "}
          against index funds, then turns the{" "}
          <Tooltip>
            <TooltipTrigger className="underline decoration-dotted underline-offset-4">
              expense ratio
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              The yearly percentage of your money a fund charges to run itself.
            </TooltipContent>
          </Tooltip>{" "}
          gap into an effective active fee &mdash; the price of the part that
          isn&rsquo;t the index.
        </p>
      </header>

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
