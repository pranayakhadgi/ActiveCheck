# ActiveCheck: brand and hero rules

Durable rules for any public-facing page. Read together with DESIGN.md. DESIGN.md wins on tokens, spacing and components; this file wins on voice, content and motion.

## What the page must say
1. What ActiveCheck measures
2. What "effective active fee" means in plain words
3. That the data is public SEC N-PORT filings
4. Where the methodology and limitations live
5. That it is research, not investment advice
6. Where to start (one primary action)

Product statement: **"ActiveCheck shows how much of a fund's fee pays for active stock selection rather than market exposure."** Never claim it evaluates a fund or recommends one.

## Voice
Direct, precise, evidence-led, calm, slightly technical, honest about limits. Short sentences. State a number, then what it means.

Banned words and claims: revolutionary, AI-powered, unlock alpha, beat the market, smarter investing, hidden opportunities, stop overpaying, trusted by thousands, the future of finance. No superlatives, no urgency, no promised outcomes, no implied lower risk.

Banned page elements: logo clouds, testimonials, press or investor badges, "trusted by" claims, pricing, large feature-card grids, FAQ walls, decorative stats with no source, stock photos (traders, skylines, handshakes, rockets, rising charts, people at laptops).

## Visual thesis (one, deliberate)
**A transparent comparison sheet.** The hero's proof element looks like a real analytical artifact built from the product's own components: fund vs closest index, fund ER, index ER, active share, effective active fee, report-period date, matched coverage %, and a quiet data-quality note.

Build it in semantic HTML/CSS reusing real product components. No raster screenshot. If real data can't render there, use clearly labelled "Illustrative example" values, with no real fund name unless that fund is already loaded and validated in the product. Never invent tickers, logos, ratings or performance.

Banned visual clichés: purple-to-blue gradients, giant gradient blobs, glassmorphism identity, neon accents, animated grids, beams, particles, noise, floating 3D objects, dark mode chosen because it looks premium.

## Typography
One variable font family loaded with `next/font`, plus a defined type scale. Tabular numerals for every figure. Distinction comes from weight, tracking, line-height and measure, not effects. No animated gradient text, outline text, all-caps marketing copy or extreme letter spacing. If the font changes, record in docs/decisions.md why it suits numeric financial content, its performance cost and the fallback stack.

## Color
Paper-like neutral base, ink text, one restrained accent with a defined semantic role, semantic green/amber/red only for real data states. Subtle borders and surface levels. WCAG AA contrast; color never the only signal.

## Layout
Editorial and strongly aligned rather than centered-by-default. Two columns only if the proof element earns equal weight. Readable measure. CTA next to the claim it supports.

Mobile order: headline, explanation, primary CTA, provenance line, proof element. The proof element must stay legible, never shrink into decoration. No hover-only interaction, no horizontal overflow at 360px.

## Page sequence (keep it short)
1. Hero
2. What ActiveCheck measures
3. Three steps: compare equity holdings → find the closest available index → translate the fee gap into an effective active fee
4. Data and limitations: public N-PORT data, report periods matter, cash/debt/derivatives excluded from rescaled weights, matched vs unmatched coverage shown, not investment advice
5. One final focused CTA

Link to `/methodology` rather than restating it in different words.

## Default copy (revise only for accuracy)
- Eyebrow: "Built from public SEC N-PORT filings"
- Headline: "See what a fund's stock-picking is really costing you."
- Support: "ActiveCheck compares a fund's holdings with available index funds, measures active share, and translates the fee difference into an effective active fee."
- Primary CTA: "Analyze a fund"
- Secondary CTA: "Read the methodology"
- Provenance line: "Public SEC filing data · Report-period aware · Research tool, not investment advice"

One primary CTA and one secondary. No stacked badges or pills.

## Motion budget
Everything animated uses only `transform` and `opacity`, never triggers layout, and is disabled under `prefers-reduced-motion: reduce`.

Allowed:
- Interaction feedback on buttons and links, 120–180ms, including keyboard focus
- One entrance reveal of the proof element, ≤280ms, no stagger, content readable immediately
- Existing shadcn/ui dialog and popover transitions, ≤220ms, focus management intact
- Optionally one non-looping emphasis inside the proof element, ≤600ms total, never needed to understand the page

Not allowed: scroll-driven effects, canvas or WebGL, autoplay video, looping ambient motion, staggered lists, animation libraries (Framer Motion, GSAP, Lottie, three.js, Rive) unless a required behavior is impossible in CSS — and that case gets written into docs/decisions.md first.

## Technical defaults
Server Components; no client component unless it provides real interaction. No client-side JavaScript for decoration. `next/image` with fixed dimensions for meaningful images only. Performance budget for `/`: no new runtime dependency, added client JS under 10KB gzipped, LCP element is text, CLS 0.

## Out of bounds
Do not change financial formulas, analytics, SEC ingestion, XML parsing, database code or API semantics while working on pages. No LLM or AI features in the product. No Morningstar names, data, logos, ratings or scraped content.