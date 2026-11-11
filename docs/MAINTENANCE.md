# Weekly maintenance run (≈ 30–45 min)

Goal: keep every published price/feature current and provable. The script **finds** changes; a human
**verifies** them. An unchanged page does not make a fact "freshly verified" by itself.

## 1. Run the checks

```bash
git pull
npm ci
npm run check-sources        # re-fetches every source + outbound link, writes reports/source-check-YYYY-MM-DD.md
```

Read the report:

| Status | Meaning | What to do |
|---|---|---|
| `BROKEN` | HTTP error / timeout | Open the URL in a browser. Moved? Find the new official URL, update `sources.json` (and outbound links). Gone? Downgrade the dependent facts to `unknown`. |
| `CHANGED` + *prices changed* | Euro amounts on the page differ | Re-read the page. Update `plan_prices.json` (new row or edit), keep `conflict_note` honest, set `verified_at`. |
| `CHANGED` (text only) | Wording/layout changed | Skim the relevant section (formats, plan table). Update `plan_features.json` only if a fact changed. |
| `NEW` | URL has no baseline yet | Nothing to verify; `--accept` stores the baseline. |
| `STALE` | `verified_at` older than 7 days (prices, affiliate terms) / 30 days (others) | Re-verify the fact on the page and bump `verified_at` + `accessed_at`. |

## 2. Update the catalogue (only what you verified)

- Edit the JSON in `src/data/catalogue/`. Every non‑unknown fact needs a row in `claim_sources.json`.
- Price changed? Prefer adding a new price row with `effective_from` and closing the old one with `effective_to`
  (keeps an observed price history) — never silently overwrite.
- A fact you can no longer confirm → `status: "unknown"`, `evidence_level: "none"`. Never guess.
- Set `verified_at` / `accessed_at` on sources you actually re-read today.

## 3. Prove it still works, then accept the new baseline

```bash
npm run validate             # schema + provenance checks
npm test                     # matcher, costs, neutrality, content safety
npm run dataset-summary      # refresh docs/DATASET.md
npm run build
npm run check-sources -- --accept   # store today's page state as the new baseline
git add -A && git commit -m "data: weekly source check YYYY-MM-DD"
```

## 4. Log one improvement

Write down time spent (it is a KPI) and make one evidence-backed improvement (a resolved `unknown`, a
corrected condition, a new source). If a check needs a vendor login or trial, note it for the Day‑4 test batch
instead of guessing.

## Automation note

The bot (or a scheduled CI job) can run step 1 and post the report. Steps 2–3 stay human-reviewed: a
scheduled run may *flag* staleness, it must never mark facts as verified.
