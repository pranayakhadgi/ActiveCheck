# ActiveCheck

Answers one question: **how much am I actually paying for the fund manager's stock-picking?**

ActiveCheck measures a fund's active share against index funds and turns the fee gap into an
**effective active fee**. It uses public SEC N-PORT data only. Not investment advice.

## Getting started

```bash
npm install
npm run dev
```

## Scripts

| Command             | What it does                    |
| ------------------- | ------------------------------- |
| `npm run dev`       | Local dev server                |
| `npm run build`     | Production build                |
| `npm test`          | Vitest (single run)             |
| `npm run test:watch`| Vitest in watch mode            |
| `npm run typecheck` | `next typegen` + `tsc --noEmit` |
| `npm run lint`      | ESLint                          |
| `npm run db:migrate`| Apply SQL migrations in `db/migrations/` |
| `npm run load`      | Load every fixture filing into Postgres (safe to re-run; also takes tickers or an accession number) |
| `npm run db:summary`| Print row counts and a content digest of what is loaded |
| `npm run fixtures`  | Re-fetch the N-PORT fixtures from EDGAR |

## Data

Set `DATABASE_URL` in `.env.local` (Neon Postgres), then:

```bash
npm run db:migrate
npm run load           # or: npm run load -- FCNTX IVV
npm run db:summary
```

Every load is keyed on the filing accession number, so re-running it never duplicates data.

## Stack

Next.js (App Router) + TypeScript strict · Tailwind + shadcn/ui + Recharts · Vitest · Postgres
(Neon) with plain SQL through postgres.js · deployed on Vercel.

See [docs/decisions.md](docs/decisions.md) for the decision log — every non-obvious choice, why it was
made, and what it trades away.
