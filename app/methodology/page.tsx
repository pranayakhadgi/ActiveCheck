import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const metadata = {
  title: "Methodology — ActiveCheck",
  description:
    "The four formulas behind ActiveCheck, the SEC N-PORT data they run on, and what they leave out.",
};

/**
 * The page the landing page's secondary CTA resolves to, and the one place the
 * formulas are written out for a reader.
 *
 * Deliberately a restatement of `CLAUDE.md` and `docs/decisions.md` rather than
 * a new argument: every other page links here instead of explaining the method
 * again in slightly different words.
 */
export default function MethodologyPage() {
  return (
    <main className="mx-auto w-full max-w-[960px] px-4 py-16">
      <header className="max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Method
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          How ActiveCheck computes its numbers
        </h1>
        <p className="mt-5 text-lg leading-8 text-muted-foreground">
          ActiveCheck shows how much of a fund&rsquo;s fee pays for active stock
          selection rather than market exposure. Four steps, all of them
          arithmetic over public filings.
        </p>
      </header>

      <section aria-labelledby="formulas" className="mt-12">
        <h2
          id="formulas"
          className="text-sm font-medium uppercase tracking-wide text-muted-foreground"
        >
          The formulas
        </h2>
        <dl className="mt-4 space-y-4">
          {FORMULAS.map((formula) => (
            <div key={formula.term}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    <dt>{formula.term}</dt>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <dd>
                    <p className="tabular rounded-lg bg-muted px-3 py-2 font-mono text-sm">
                      {formula.rule}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {formula.plain}
                    </p>
                  </dd>
                </CardContent>
              </Card>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="sources" className="mt-12 max-w-2xl">
        <h2
          id="sources"
          className="text-sm font-medium uppercase tracking-wide text-muted-foreground"
        >
          Data sources
        </h2>
        <ul className="mt-4 space-y-3 text-base leading-7">
          <li>
            Holdings come from each fund&rsquo;s most recent{" "}
            <span className="font-medium">NPORT-P</span> filing on SEC EDGAR.
            Every figure on the site is labelled with that filing&rsquo;s report
            period, and the fund page links to the filing itself.
          </li>
          <li>
            Indexes are represented by <span className="font-medium">index funds</span>,
            which file the same form. Index data itself is licensed; an index
            fund is free, public, and comes from the same source as everything
            else here.
          </li>
          <li>
            Securities are matched by CUSIP, then ISIN, then a normalized name.
            The matched and unmatched percentages are shown on every comparison.
          </li>
          <li>
            Expense ratios are each fund&rsquo;s publicly quoted headline fee and
            are currently marked{" "}
            <span className="font-medium">unverified</span>, so any effective
            active fee should be read as illustrative.
          </li>
        </ul>
      </section>

      <section aria-labelledby="limits" className="mt-12 max-w-2xl">
        <h2
          id="limits"
          className="text-sm font-medium uppercase tracking-wide text-muted-foreground"
        >
          Limitations
        </h2>
        <ul className="mt-4 space-y-3 text-base leading-7">
          <li>
            <span className="font-medium">Report periods matter.</span> Holdings
            are as of a filing date, not today, and a fund and its benchmark can
            be filed for different months. Where they are, the fund page says so
            — the gap inflates active share slightly.
          </li>
          <li>
            <span className="font-medium">Cash, debt, derivatives and preferred
            shares are excluded</span> and the remaining stock weights rescaled to
            sum to 100%. Active share is a statement about stock picks, and cash
            would inflate it. The excluded percentage is always shown.
          </li>
          <li>
            <span className="font-medium">Index funds are not indexes.</span>{" "}
            They carry their own small cash drag and tracking differences.
          </li>
          <li>
            <span className="font-medium">A small active share amplifies the
            fee.</span> Below 20% active share the whole fee gap is being divided
            by a sliver of the portfolio, so the result is a direction rather
            than a price. The fund page flags it.
          </li>
          <li>
            <span className="font-medium">Active share is not performance.</span>{" "}
            A high number means a fund differs from its index, not that it will
            do better or worse.
          </li>
        </ul>
      </section>

      <Separator className="mt-12" />

      <p className="mt-6 text-sm leading-6 text-muted-foreground">
        ActiveCheck is a research tool built on public filings, not investment
        advice.{" "}
        <Link href="/" className="text-[var(--color-link)] hover:underline">
          Back to the fund list
        </Link>
        .
      </p>
    </main>
  );
}

const FORMULAS = [
  {
    term: "Weights",
    rule: "w_i = |pctVal_i| ÷ Σ |pctVal| over equity holdings",
    plain:
      "Only common equity counts. The remaining positions are rescaled so they sum to 1 in each portfolio, and the share that was dropped is reported as the excluded percentage.",
  },
  {
    term: "Active share",
    rule: "0.5 × Σ |w_fund,i − w_index,i| over the union of securities",
    plain:
      "How much of the fund does not look like the index: 0% is the index itself, 100% shares nothing with it. A holding with no counterpart in the index counts as fully active.",
  },
  {
    term: "Closest index",
    rule: "argmin over benchmarks of active share",
    plain:
      "The benchmark the fund resembles most is simply the one it has the lowest active share against. Every benchmark's figure is shown, not only the winner's.",
  },
  {
    term: "Effective active fee",
    rule: "(fund expense ratio − index expense ratio) ÷ active share",
    plain:
      "You can buy the index-like part of the fund at the index fund's price, so the whole fee gap is the price of the part that differs. It is undefined when there is no active share to divide by, and a negative result — a fund cheaper than its index — is shown as it falls out.",
  },
] as const;
