"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { percent, reportDate } from "@/lib/format";
import type { FundListItem } from "@/lib/queries";
import { CLOSET_INDEXER_ACTIVE_SHARE } from "@/lib/verdict";

/**
 * The home page's fund combobox (DESIGN.md: search by name or ticker).
 *
 * The whole list is rendered up front and filtered in the browser. With a
 * handful of loaded funds that is faster and simpler than a search endpoint,
 * and it means the list is the page: someone who never types still sees every
 * fund and can click one. If the universe grows past a page or two of funds,
 * this is the component that becomes a server-side query.
 */
export function FundSearch({ funds }: { funds: FundListItem[] }) {
  const [query, setQuery] = useState("");

  // cmdk's own fuzzy scoring reorders as you type; filtering by hand keeps the
  // list in the order the server sent (active funds first, then benchmarks).
  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return funds;
    return funds.filter(
      (fund) =>
        fund.name.toLowerCase().includes(needle) ||
        (fund.ticker?.toLowerCase().includes(needle) ?? false),
    );
  }, [funds, query]);

  const active = matches.filter((fund) => !fund.isIndex);
  const benchmarks = matches.filter((fund) => fund.isIndex);

  return (
    <Command shouldFilter={false} className="rounded-lg border">
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder="Search a fund by name or ticker…"
      />
      <CommandList className="max-h-none">
        <CommandEmpty>No fund matches “{query}”.</CommandEmpty>
        {active.length > 0 ? (
          <CommandGroup heading="Funds">
            {active.map((fund) => (
              <FundRow key={fund.seriesId} fund={fund} />
            ))}
          </CommandGroup>
        ) : null}
        {benchmarks.length > 0 ? (
          <CommandGroup heading="Index funds (used as benchmarks)">
            {benchmarks.map((fund) => (
              <FundRow key={fund.seriesId} fund={fund} />
            ))}
          </CommandGroup>
        ) : null}
      </CommandList>
    </Command>
  );
}

function FundRow({ fund }: { fund: FundListItem }) {
  const tone =
    fund.activeShare === null
      ? "var(--muted-foreground)"
      : fund.activeShare < CLOSET_INDEXER_ACTIVE_SHARE
        ? "var(--signal-low)"
        : "var(--signal-high)";

  return (
    // Not `asChild`: CommandItem always renders a trailing check icon after its
    // children, so slotting would hand Radix two children. The link fills the
    // row instead and the unused check is hidden.
    <CommandItem value={fund.seriesId} className="p-0 [&>svg]:hidden">
      <Link
        href={`/fund/${fund.seriesId}`}
        className="flex w-full items-center gap-3 rounded-sm px-2 py-1.5"
      >
        <span className="tabular w-16 shrink-0 font-medium">{fund.ticker ?? "—"}</span>
        <span className="min-w-0 flex-1 truncate">{fund.name}</span>
        {fund.activeShare === null ? null : (
          <span className="tabular shrink-0 text-right text-xs" style={{ color: tone }}>
            {percent(fund.activeShare)} active
            <span className="block text-muted-foreground">
              vs {fund.closestIndexTicker}
              {fund.reportPeriod ? ` · ${reportDate(fund.reportPeriod)}` : ""}
            </span>
          </span>
        )}
      </Link>
    </CommandItem>
  );
}
