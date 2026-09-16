"use client";

import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from "recharts";

import { percent } from "@/lib/format";
import type { VerdictTone } from "@/lib/verdict";

/**
 * Semicircle gauge, 0–100%, for active share (DESIGN.md, fund page stat row).
 *
 * A client component only because Recharts measures the DOM. The number itself
 * is plain text in the middle rather than an SVG label, so it stays selectable,
 * inherits the tabular figures, and is read out by a screen reader even if the
 * chart never paints.
 */
export function ActiveShareGauge({
  value,
  tone,
}: {
  /** Active share as a decimal fraction, 0–1. */
  value: number;
  tone: VerdictTone;
}) {
  const colour = tone === "low" ? "var(--signal-low)" : "var(--signal-high)";
  const data = [{ name: "active share", value: Math.max(0, Math.min(1, value)) * 100 }];

  return (
    <div className="relative h-32">
      {/* aria-hidden: the figure below is the accessible copy of this number. */}
      <div aria-hidden className="absolute inset-0">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            data={data}
            startAngle={180}
            endAngle={0}
            innerRadius="150%"
            outerRadius="190%"
            cy="100%"
            barSize={12}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} axisLine={false} />
            <RadialBar
              dataKey="value"
              cornerRadius={7}
              fill={colour}
              // The unfilled remainder of the arc, so the scale is visible at a
              // glance rather than implied by the bar's length alone.
              background={{ fill: "var(--muted)" }}
              isAnimationActive={false}
            />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>
      <p
        className="tabular absolute inset-x-0 bottom-1 text-center text-2xl font-semibold"
        style={{ color: colour }}
      >
        {percent(value)}
      </p>
    </div>
  );
}
