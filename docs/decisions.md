# Decision log

Format: **Decision**: why · alternatives considered · trade-off

- **TypeScript everywhere**: one language across loader, API and UI makes it easier to explain · Python loader · slightly worse data tooling
- **Raw SQL instead of an ORM**: shows SQL skill and keeps queries visible · Prisma/Drizzle · more boilerplate
- **Index funds stand in for indexes**: free public data from the same source · licensed index data · small tracking differences and cash drag
- **Equity-only rescaled weights**: active share is defined over stock picks; cash would inflate it · raw pctVal · excluded % must be shown
- **Scaffolded with `create-next-app` in a temp dir, then moved in**: the folder name `activeChecek` has a capital letter, which npm rejects as a package name · renaming the folder · one-off manual move; `package.json` is named `activecheck`
- **shadcn/ui `radix` base, `nova` preset**: the current CLI has no `--base-color` flag, and radix+nova is the classic shadcn setup (Radix primitives, lucide icons) · the newer `base` component library · palette is then overwritten by hand with the DESIGN.md tokens
- **Theme tokens defined as CSS variables on `:root` / `.dark`, plus a `prefers-color-scheme` block**: there is no theme toggle yet, so dark mode has to follow the OS · shipping `next-themes` now · Tailwind `dark:` utilities do not fire from the media query, so colour must come from the variables, not from `dark:` classes
- **Signal hues lightened in dark mode** (amber `#F59E0B`, green `#4ADE80`, red `#F87171`): the light-mode values fail WCAG AA on `#0C0A09` · keeping the exact hex values · same hues, different lightness
- **`npm run typecheck` runs `next typegen` first**: Next 16 generates `LayoutProps`/`PageProps` into `.next/types`, so bare `tsc --noEmit` fails on a clean checkout (as in CI) · hand-writing the prop types · typecheck depends on the Next CLI
- **`@types/node` bumped to v24**: Vitest 5 peer-requires `^22 || >=24`, and the local Node is v24 · `--legacy-peer-deps` · none
- **Vitest config as `vitest.config.mts`**: the package is CommonJS, so a `.ts` config warns under Vite's native config loader · `"type": "module"` in package.json · none
