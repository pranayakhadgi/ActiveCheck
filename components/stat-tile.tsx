import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * One tile of the fund page's stat row: a label, the number, and the data date
 * that number is true as of.
 *
 * DESIGN.md makes the date non-optional — every number carries one — so it is a
 * required prop rather than something a call site can forget.
 */
export function StatTile({
  label,
  hint,
  asOf,
  children,
  footnote,
}: {
  label: string;
  /** One-sentence definition of the jargon in `label`. */
  hint: string;
  /** Report period the value describes, `YYYY-MM-DD`, already formatted. */
  asOf: string;
  /** The number itself, or a gauge. */
  children: ReactNode;
  footnote?: ReactNode;
}) {
  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col gap-3 pt-6">
        <Tooltip>
          <TooltipTrigger className="w-fit text-left text-sm font-medium text-muted-foreground underline decoration-dotted underline-offset-4">
            {label}
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">{hint}</TooltipContent>
        </Tooltip>

        <div className="flex-1">{children}</div>

        <div className="space-y-1">
          {footnote ? (
            <p className="text-xs leading-5 text-muted-foreground">{footnote}</p>
          ) : null}
          <p className="tabular text-xs text-muted-foreground">Data as of {asOf}</p>
        </div>
      </CardContent>
    </Card>
  );
}
