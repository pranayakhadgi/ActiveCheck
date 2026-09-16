# ActiveCheck

Answers one question: "How much am I actually paying for the fund manager's stock-picking?"
Measures a fund's **active share** against index funds and turns the fee gap into an **effective active fee**.
Uses public SEC N-PORT data only. Not investment advice.

Design rules: @DESIGN.md
Decision log (update it for every non-obvious choice): @docs/decisions.md

## Stack
- Next.js (App Router) + TypeScript (strict), deployed on Vercel
- Postgres on Neon; env var `DATABASE_URL`; plain SQL through `postgres` (postgres.js), no ORM
- SQL migrations in `db/migrations/NNN_name.sql`, applied by `npm run db:migrate`
- UI: Tailwind + shadcn/ui + Recharts
- Tests: Vitest; fixtures are real N-PORT XML files in `fixtures/nport/`
- CI: GitHub Actions runs lint, typecheck and tests on every push

## Commands
- `npm run dev`: local dev server
- `npm test`: Vitest
- `npm run typecheck`, `npm run lint`
- `npm run db:migrate`: apply migrations
- `npm run load -- <fixture-or-accession>`: load filings (safe to re-run)

## Layout
- `lib/edgar/`: EDGAR fetch (User-Agent with contact info, max 10 req/s)
- `lib/nport/`: XML parser into typed holdings
- `lib/analytics/`: pure functions (activeShare, closestIndex, effectiveActiveFee), fully unit-tested
- `scripts/`: loader and migration runners
- `app/`: pages and route handlers (`app/api/...`)

## Formulas (do not change without updating docs/decisions.md)
- Weights = equity holdings rescaled so they sum to 1 in each portfolio (cash, derivatives and debt are excluded; report the excluded %)
- Active share = 0.5 × Σ |w_fund,i − w_index,i| over the union of securities
- Closest index = the benchmark with the lowest active share
- Effective active fee = (fund ER − index ER) ÷ active share

## Rules
- Keep analytics code pure and deterministic. No I/O in `lib/analytics/`.
- Match securities by CUSIP, then ISIN, then normalized name. Always compute and show the unmatched %.
- Every load is keyed on the filing accession number, so it never duplicates data (use upserts).
- Always show the report-period date next to any number.
- No Morningstar names, logos, ratings or data. Never scrape morningstar.com.
- No LLM API calls in the product.
- Work in small steps: plan, implement, run tests, commit. Don't finish a step with tests failing.
- After each step, explain in 2–3 plain sentences what changed and why. The owner must be able to defend every choice in an interview.