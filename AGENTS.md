# AGENTS.md — rules for every coding agent (Claude, Codex, Antigravity, Copilot)

Repository: https://github.com/DrPreecy/erecipe_finder · Default branch: `main`
Read `README.md`, `docs/product-brief.md` and `src/lib/catalogue-schema.ts` before your first change.

## Stack & commands
Node ≥ 22.12 (see `.nvmrc`), TypeScript strict, Astro (static) + one React island, Zod, Vitest, npm.

| Command | Purpose |
|---|---|
| `npm ci` | install (never `npm install <pkg>` unless the issue allows a new dependency) |
| `npm run lint` | ESLint |
| `npm run typecheck` | `astro sync && tsc --noEmit` |
| `npm test` | Vitest |
| `npm run validate` | catalogue JSON + provenance rules |
| `npm run build` | validate + static build |
| `npm run ci` | all of the above — **must pass before you open a PR** |
| `npm run dataset-summary` | regenerate `docs/DATASET.md` after data changes |

## Hard rules
1. Work ONLY inside the issue's **Allowed paths**. Need anything else → stop and comment on the issue.
2. Do not edit `.github/**`, `package.json` dependencies, `package-lock.json`, `AGENTS.md`, `CLAUDE.md`
   unless the issue explicitly allows it.
3. Every behaviour change ships with a Vitest test named after its acceptance criterion (`AC1 …`).
4. Never delete, skip or weaken a test to get green.
5. **Facts need sources.** Every vendor fact/price has a `sources.json` entry (URL + `verified_at`) and a
   `claim_sources.json` row with a short quote. Unknown stays `unknown`/`null` — never guess, never `0`.
6. **Money can't buy ranking.** Matching/sorting must never read `affiliate_programs.json`/`affiliate_links.json`
   (`toPublicCatalogue` strips them; `tests/match.test.ts` proves it).
7. **Technical facts only (RDG).** No legal advice, no "rechtssicher", "gesetzeskonform", "Pflicht für Sie".
   We describe what software does, never who is legally obliged to do what.
8. **No advertising claims without proof (UWG).** No "beste", "günstigste", "Testsieger" unless a dated,
   documented comparison in this repo proves it. Affiliate links: `rel="sponsored noopener"` + visible "Anzeige".
9. Ambiguous spec → ask in the issue, do not invent.
10. One PR per issue, branch `agent/<issue>-<slug>`, PR body starts with `Closes #<issue>`, use the PR template.

## Code Review Rules
- Flag any change outside the issue's Allowed paths as P1.
- Flag a vendor fact/price without `sources.json` + `claim_sources.json` provenance as P1.
- Flag ranking/matching code that imports affiliate data as P0.
- Flag user-facing German copy that gives legal advice or makes superlative/advertising claims as P1.
- Flag affiliate links without `rel="sponsored"` and a visible "Anzeige" label as P1.
