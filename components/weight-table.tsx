import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { percent, signedPercent } from "@/lib/format";
import type { WeightRow } from "@/lib/queries";

/**
 * A small diverging bar: zero in the middle, overweights growing right in
 * green, underweights growing left in red.
 *
 * Decoration only — `aria-hidden`, because the signed number in the same cell
 * is the accessible value, and DESIGN.md forbids colour carrying meaning alone.
 * Widths are relative to the largest difference in the table, so the biggest
 * bet always fills its half and the rest are readable against it.
 */
function DivergingBar({ difference, scale }: { difference: number; scale: number }) {
  const width = scale > 0 ? (Math.abs(difference) / scale) * 50 : 0;
  const overweight = difference > 0;

  return (
    <span aria-hidden className="relative block h-2 w-full min-w-16 rounded-sm bg-muted">
      <span
        className="absolute top-0 h-2 rounded-sm"
        style={{
          width: `${width}%`,
          left: overweight ? "50%" : `${50 - width}%`,
          backgroundColor: overweight ? "var(--overweight)" : "var(--underweight)",
        }}
      />
    </span>
  );
}

/**
 * Top overweights or underweights against the closest index — where a fund's
 * active share actually comes from.
 *
 * The table scrolls inside its own card rather than the page (DESIGN.md:
 * no horizontal scroll at 360px).
 */
export function WeightTable({
  title,
  description,
  rows,
  benchmarkTicker,
}: {
  title: string;
  description: string;
  rows: WeightRow[];
  benchmarkTicker: string;
}) {
  const scale = Math.max(0, ...rows.map((row) => Math.abs(row.difference)));

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No positions on this side of the comparison.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Security</TableHead>
                <TableHead className="text-right">Fund</TableHead>
                <TableHead className="text-right">{benchmarkTicker}</TableHead>
                <TableHead className="text-right">Difference</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.matchKey}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="text-right">{percent(row.fundWeight, 2)}</TableCell>
                  <TableCell className="text-right">{percent(row.indexWeight, 2)}</TableCell>
                  <TableCell
                    className="text-right font-medium"
                    style={{
                      color:
                        row.difference > 0 ? "var(--overweight)" : "var(--underweight)",
                    }}
                  >
                    {signedPercent(row.difference)}
                  </TableCell>
                  <TableCell>
                    <DivergingBar difference={row.difference} scale={scale} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
