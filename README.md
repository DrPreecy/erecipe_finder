# E‑Rechnung Finder

A small, **evidence-backed** finder for German e‑invoicing software: which exact plan supports *your* workflow
(XRechnung/ZUGFeRD, receive/send, volume, handover), what it costs in year one, and which source says so.

Status: **Day 1 of 7** — scaffold, data contract, first verified dataset (3 vendors, 9 plans), deterministic
matcher with tests, a minimal finder page and the weekly source check. Not deployed, no affiliate programme
applied for, nothing labelled “tested”.

## Quick start

```bash
nvm use            # Node 24 (see .nvmrc); Node ≥ 22.12 works
npm install
npm run dev        # http://localhost:4321
```

| Command | What it does |
|---|---|
| `npm run dev` | Local dev server with hot reload |
| `npm test` | Vitest: matcher, costs, neutrality, data integrity, link policy |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript strict |
| `npm run validate` | Validates every catalogue JSON file + provenance rules (runs before every build) |
| `npm run build` | Static site into `dist/` |
| `npm run check-sources` | Weekly maintenance: re-fetch all sources, report BROKEN/CHANGED/STALE |
| `npm run dataset-summary` | Regenerates `docs/DATASET.md` from the JSON |
| `npm run ci` | Everything CI runs |

Docker (optional): `docker build -t erechnung-finder . && docker run --rm -p 8080:80 erechnung-finder`.

## How the project is organised

```
src/
  data/catalogue/*.json   ← the catalogue: one JSON file per "table" (vendors, plans, plan_prices, ...)
  lib/
    catalogue-schema.ts   ← Zod schemas = the data contract (read this first)
    catalogue.ts          ← loads + validates the JSON; strips commercial data for the matcher
    integrity.ts          ← cross-table rules: every fact has a source, "tested" needs a test run, ...
    match.ts              ← deterministic matching (pure functions, no I/O)
    pricing.ts            ← first-year cost maths in integer cents
    link-policy.ts        ← which outbound link a visitor gets (after ranking)
    source-check.ts       ← helpers for the weekly source check
  components/Finder.tsx   ← the React island (answers stay in browser memory)
  pages/index.astro       ← the finder page + static fallback table (works without JS)
scripts/                  ← validate-catalogue, check-sources, dataset-summary
tests/                    ← Vitest
db/migrations/001_init.sql← Postgres blueprint for v2 (NOT used at launch)
data/source-snapshots.json← baseline for check-sources
reports/                  ← source-check reports
docs/                     ← product brief, dataset summary, maintenance runbook
fixtures/ evidence/       ← Day 4: synthetic invoices + permitted test evidence
```

## Rules this code enforces

1. **Unknown stays unknown.** Missing facts are treated as unknown; unknown prices are `null`, never `0`.
2. **Every fact has a source** (URL + verified date). `npm run validate` fails otherwise — and so does the build.
3. **“Tested” needs a real test run.** Until Day 4 everything is documentation-only.
4. **Money can’t buy ranking.** The matcher never sees affiliate data; a test proves it.
5. **No legal advice.** The finder matches technical needs; it never decides who is obliged to do what.

## Adding or changing a fact (beginner walkthrough)

1. Open the vendor page, find the sentence/table that proves the fact.
2. Add/edit the row in `src/data/catalogue/plan_features.json` (or `plan_prices.json`).
3. Add a row in `claim_sources.json` pointing to the source id + a short quote in `supporting_note`.
4. If it's a new page, add it to `sources.json` (`published_at` only if the page states a date).
5. `npm run validate && npm test` — fix whatever it complains about.

See `docs/MAINTENANCE.md` for the weekly routine and `docs/DATASET.md` for the current data.

## Next (Day 2 → plan)

Resolve the open questions in `docs/DATASET.md`, vendor/plan detail pages, methodology page, legal page
structure, then affiliate applications (status recorded as pending, never assumed).
