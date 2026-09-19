# Landing page (`/`) design brief

Scope: the public home page only. No change to analytics, ingestion, schema or the fund page.
Authority: `DESIGN.md` wins on tokens, spacing and components; `docs/brand-and-hero.md` wins on
voice, content and motion. Three conflicts between them are open — see **Open decisions** at the end.

## Hero copy

| Element | Copy |
| --- | --- |
| Eyebrow | Built from public SEC N-PORT filings |
| Headline (`h1`) | See what a fund's stock-picking is really costing you. |
| Support | ActiveCheck compares a fund's holdings with available index funds, measures active share, and translates the fee difference into an effective active fee. |
| Primary CTA | Analyze a fund → `#find-a-fund` (the existing `FundSearch` combobox) |
| Secondary CTA | Read the methodology → `/methodology` |
| Provenance line | Public SEC filing data · Report-period aware · Research tool, not investment advice |

Product statement for `<meta description>` and the "What ActiveCheck measures" section:
**"ActiveCheck shows how much of a fund's fee pays for active stock selection rather than market
exposure."** Never "evaluates", "rates" or "recommends".

## Proof element — a transparent comparison sheet

Semantic HTML in a `Card`, built from real product components. No screenshot, no new chart.
Values below are the loaded TRBCX filing as of the digest `5998c715…`; both sides share one report
period, so it carries no mismatch caveat.

| Row | Field | Value | Source |
| --- | --- | --- | --- |
| Caption | Fund · ticker | T. Rowe Price Blue Chip Growth Fund · TRBCX | `funds` |
| Caption | Closest index · ticker | iShares S&P 500 Growth ETF · IVW | `results.is_closest` |
| Caption | Data as of | 30 Jun 2026 (both sides) | `filings.report_period` |
| Figure 1 | Active share | 32.0% | `results.active_share` |
| Figure 2 | Fund expense ratio | 0.68%/yr | `funds.expense_ratio` |
| Figure 3 | Index expense ratio | 0.18%/yr | `funds.expense_ratio` |
| Figure 4 | **Effective active fee** | **1.56%/yr** | `results.effective_active_fee` |
| Verdict | `verdict()` sentence | "About 68% of this fund matches IVW, its closest index. You pay ~1.56%/yr for the rest." | `lib/verdict.ts` |
| Note | Matched coverage | 89.3% of stock weight matched to IVW | `results.matched_pct` |
| Note | Excluded | 2.0% non-equity excluded and weights rescaled | `results.excluded_pct` |
| Note | Caveat | Expense ratio unverified — the fee is illustrative | `funds.er_verified` |

Layout: a two-column definition list (label left, `tabular-nums` value right) for the four figures,
`Separator`, then the verdict sentence at `text-lg` in `--signal-low` (32.0% is below the 60%
closet-indexer line), then the notes at `text-xs` in `--muted-foreground`. The whole card links to
`/fund/S000002069`. Every figure keeps its unit and the one shared data date, per `DESIGN.md`.

## Type scale and color roles

Inter via `next/font/google` (already loaded as `--font-inter`); `tabular-nums` on every figure
through the existing `.tabular` class. Weight and measure carry the hierarchy — no effects.

| Role | Classes |
| --- | --- |
| Eyebrow | `text-xs font-medium uppercase tracking-wide text-muted-foreground` |
| Headline | `text-3xl sm:text-5xl font-semibold tracking-tight`, measure ≤ 18 words |
| Support | `text-lg leading-8 text-muted-foreground`, `max-w-2xl` |
| Section heading | `text-sm font-medium uppercase tracking-wide text-muted-foreground` |
| Body | `text-base leading-7` |
| Proof figure | `text-2xl font-semibold tabular`; headline fee `text-3xl` |
| Note / provenance | `text-xs leading-5 text-muted-foreground` |

Colors are existing variables only: `--background` paper, `--card` surface, `--border` hairlines,
`--foreground` ink, `--muted-foreground` secondary. `--link` (`#1D4ED8`) stays links and focus rings
only. The primary CTA is the ink `Button` default (`bg-primary`), the secondary is `variant="link"`.
`--signal-low` / `--signal-high` appear only on the proof element's real verdict. No gradients, no
new hue.

## Layout

Desktop (≥ 1024px), inside the existing `max-w-[960px]` container: a 12-column grid, hero text in
columns 1–6 and the proof card in 7–12, top-aligned, single `py-20` band. Left-aligned, not
centered. CTAs sit directly under the support paragraph; the provenance line sits under the CTAs at
`text-xs`. Between 640–1023px the proof card drops below the text at full width.

Mobile (360px minimum): single column, `px-4`, source order **headline → support → primary CTA →
secondary CTA → provenance → proof element**. The proof card keeps full type size and becomes a
stacked label/value list; it never becomes decoration. No horizontal overflow, no hover-only
affordance.

## Sections beneath the hero

1. **What ActiveCheck measures** — the product statement plus one paragraph defining active share
   and effective active fee in plain words. Existing `Tooltip` definitions reused.
2. **Three steps** — compare equity holdings → find the closest available index → translate the fee
   gap into an effective active fee. Three `Card`s, the existing home-page pattern, copy tightened.
3. **Find a fund** — `id="find-a-fund"`, the existing `FundSearch` combobox, unchanged.
4. **Data and limitations** — public N-PORT data, report periods matter, cash/debt/derivatives
   excluded from rescaled weights, matched vs unmatched coverage shown, expense ratios currently
   unverified, not investment advice. Links to `/methodology` rather than restating it.
5. **Final CTA** — one line and the same primary action.

`SiteFooter` already carries the required disclaimer on every page.

## Motion

CSS only, `transform` and `opacity` only, all of it inside `@media (prefers-reduced-motion: no-preference)`.
`tw-animate-css` is already installed; no new dependency.

| What | Property | Duration | Easing |
| --- | --- | --- | --- |
| Button / link hover and keyboard focus | `background-color`, `translate-y` (existing `Button` transition) | 150ms | `ease-out` |
| Proof card entrance, once, no stagger | `opacity 0→1`, `translateY(8px→0)` | 240ms | `ease-out` |
| Command popover / dialog (existing shadcn) | as shipped | ≤ 220ms | as shipped |

Nothing else: no scroll effects, no looping motion, no canvas, no animation library. Content is
readable before any animation runs; LCP is the headline text; target CLS 0 and no added client JS
beyond the combobox that already exists.

## Resolved conflicts (DESIGN.md vs brand-and-hero.md)

1. **Real fund, unverified label.** The brand rules allow a real fund name only if it is "loaded and
   validated". TRBCX's *holdings* are loaded and validated; its *expense ratio* is an `unverified`
   placeholder (`data/expense_ratios.csv`), and the effective active fee is computed from it —
   real arithmetic over a placeholder input. **Decision:** show the real TRBCX vs IVW card, with the
   same "expense ratio unverified · the fee is illustrative" note the fund page already renders. The
   note is not optional and not smaller than the other notes.
2. **Primary CTA is a button.** `DESIGN.md` puts the search combobox at the top of the home page; the
   brand rules want one primary CTA beside the claim. **Decision:** "Analyze a fund" is an ink
   `Button` anchored to `#find-a-fund`, and `FundSearch` moves to its own section below the hero
   (section 3 above). Revisit if the loaded universe grows past a page of funds.
3. **`/methodology` gets built.** `DESIGN.md` lists the page; `app/` has no such route. **Decision:**
   build a minimal `/methodology` — the four formulas, the data sources, and the limitations —
   drawn from `CLAUDE.md` and `docs/decisions.md`, so the secondary CTA resolves. It is a Server
   Component reusing `Card`, `Separator` and `SiteFooter`; no new data, no new dependency.
