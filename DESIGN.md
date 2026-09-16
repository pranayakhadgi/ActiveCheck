# ActiveCheck Design

## Feel
Calm, credible, data-first, like a well-edited financial research note. No hype, gradients or emoji.
Numbers are the heroes. Every number has a label, a unit and a data date.

## Tokens (Tailwind / CSS variables)
- Background `#FAFAF9`, surface `#FFFFFF`, border `#E7E5E4`
- Text `#1C1917`, muted text `#78716C`
- Accent (links, focus) `#1D4ED8`
- Signal: low active share / closet indexer `#B45309` (amber); high active share `#15803D` (green)
- Overweight bars `#15803D`, underweight bars `#B91C1C`
- Dark mode: invert the neutrals (bg `#0C0A09`, surface `#1C1917`, text `#F5F5F4`) and keep signal hues
- Font: Inter for UI; tabular numerals (`font-variant-numeric: tabular-nums`) for every number
- Radius 8px; spacing on a 4px grid; max content width 960px

## Pages
1. **Home**: one-line pitch, fund search (combobox by name/ticker), short "How it works" (3 steps), disclaimer.
2. **Fund page** `/fund/[seriesId]`:
   - Header: fund name, ticker/share class used, "Data as of YYYY-MM-DD"
   - Stat row (3 tiles): Active share (semicircle gauge 0–100%) · Closest index · Effective active fee (%/yr)
   - Plain-English verdict sentence, e.g. "About 60% of this fund matches its closest index. You pay ~2.05%/yr for the rest."
   - Two tables: Top 10 overweights, top 10 underweights (security, fund %, index %, difference), with a small diverging bar
   - Data quality note: matched %, excluded non-equity %
   - Comparison table: active share against each benchmark
3. **Methodology** `/methodology`: formulas, data sources, limitations.

## Components
shadcn/ui: Card, Table, Badge, Command (search), Tooltip, Separator. Recharts for the gauge and bars.

## Rules
- Mobile-first; works at 360px width; no horizontal scroll (tables scroll inside their card)
- WCAG AA contrast; color never carries meaning alone (add labels and signs like +1.2%)
- Tooltips define jargon (active share, expense ratio) in one sentence
- Footer on every page: "Not investment advice. Source: SEC EDGAR N-PORT filings."