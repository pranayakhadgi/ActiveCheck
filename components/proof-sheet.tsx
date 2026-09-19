import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { feePerYear, percent, percentPoints, reportDate } from "@/lib/format";
import type { ProofSheet as ProofSheetData } from "@/lib/hero-proof";

/**
 * The hero's proof element: one fund, its closest index, and the four figures
 * that turn the fee gap into a price — the fund page's headline in a single
 * card.
 *
 * A server component with no interaction of its own. It renders whatever
 * `getHeroProof` hands it, including the fallback, so the "Illustrative
 * example" label and the unverified-fee note are part of the same markup as the
 * numbers rather than something a call site can drop.
 */
export function ProofSheet({ data }: { data: ProofSheetData }) {
  const asOf = data.asOf ? reportDate(data.asOf) : null;
  const indexAsOf = data.indexAsOf ? reportDate(data.indexAsOf) : null;
  const periodsDiffer = asOf !== null && indexAsOf !== null && asOf !== indexAsOf;
  const toneColour =
    data.verdictTone === "low" ? "var(--signal-low)" : "var(--signal-high)";

  const sheet = (
    // Motion is opt-in per DESIGN.md's reduced-motion rule: every utility here
    // is behind `motion-safe`, so under `prefers-reduced-motion: reduce` the
    // card simply renders, already visible.
    <Card className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-[240ms] motion-safe:ease-out">
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {data.illustrative ? "Illustrative example" : "Worked example"}
          </p>
          <p className="text-base font-medium leading-snug">
            {data.fundName}
            {data.fundTicker ? (
              <span className="tabular text-muted-foreground"> · {data.fundTicker}</span>
            ) : null}
          </p>
          <p className="text-sm text-muted-foreground">
            vs {data.indexName}
            {data.indexTicker ? (
              <span className="tabular"> · {data.indexTicker}</span>
            ) : null}
          </p>
          <p className="tabular text-xs text-muted-foreground">
            {asOf === null
              ? "Example figures — no filing behind them"
              : periodsDiffer
                ? `Data as of ${asOf} · ${data.indexTicker ?? "index"} as of ${indexAsOf}`
                : `Data as of ${asOf} (both sides)`}
          </p>
        </div>

        <Separator />

        <dl className="space-y-2">
          <Figure label="Active share" value={percent(data.activeShare)} />
          <Figure
            label="Fund expense ratio"
            value={data.fundExpenseRatio === null ? "—" : feePerYear(data.fundExpenseRatio)}
          />
          <Figure
            label="Index expense ratio"
            value={data.indexExpenseRatio === null ? "—" : feePerYear(data.indexExpenseRatio)}
          />
          <Figure
            label="Effective active fee"
            value={
              data.effectiveActiveFee === null ? "—" : feePerYear(data.effectiveActiveFee)
            }
            headline
          />
        </dl>

        <Separator />

        <p className="text-lg leading-7" style={{ color: toneColour }}>
          {data.verdictSentence}
        </p>

        <div className="space-y-1 text-xs leading-5 text-muted-foreground">
          <p className="tabular">
            {percentPoints(data.matchedPct)} of stock weight matched to{" "}
            {data.indexTicker ?? "the index fund"}.
          </p>
          <p className="tabular">
            {percentPoints(data.excludedPct)} non-equity excluded and weights rescaled.
          </p>
          {data.erVerified ? null : (
            <p>Expense ratio unverified — the fee is illustrative.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (!data.href) return sheet;

  return (
    <Link
      href={data.href}
      aria-label={`See the full report for ${data.fundName}`}
      className="block rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {sheet}
    </Link>
  );
}

/** One label/value row; the value carries its unit and lines up on the right. */
function Figure({
  label,
  value,
  headline = false,
}: {
  label: string;
  value: string;
  headline?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <dt
        className={
          headline ? "text-sm font-medium" : "text-sm text-muted-foreground"
        }
      >
        {label}
      </dt>
      <dd
        className={`tabular font-semibold ${headline ? "text-3xl" : "text-2xl"}`}
      >
        {value}
      </dd>
    </div>
  );
}
