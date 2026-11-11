/**
 * npm run dataset-summary → writes docs/DATASET.md (a readable table of the catalogue).
 * Re-run after every catalogue change so the summary never drifts from the JSON.
 */
import { writeFileSync } from "node:fs";
import { loadCatalogue } from "../src/lib/catalogue";
import type { FeatureKey } from "../src/lib/catalogue-schema";
import { formatEuro } from "../src/lib/pricing";

const c = loadCatalogue();
const keys: FeatureKey[] = [
  "receive_xrechnung", "receive_zugferd", "validate_incoming", "send_xrechnung", "send_zugferd",
  "send_quota", "raw_xml_export", "datev_export", "bookkeeping_euer", "runs_locally",
];
const short: Record<string, string> = { supported: "✓", unsupported: "✗", conditional: "◐", unknown: "?" };
const fact = (planId: string, k: FeatureKey) => c.plan_features.find((f) => f.plan_id === planId && f.feature_key === k);
const cell = (planId: string, k: FeatureKey) => {
  const f = fact(planId, k);
  if (!f) return k === "send_quota" && fact(planId, "send_xrechnung")?.status === "unsupported" ? "n/a" : "?";
  if (k === "send_quota" && f.status === "supported" && f.value)
    return f.value.max === null ? "unbegrenzt" : `${f.value.max.toLocaleString("de-DE")}/${f.value.per === "year" ? "Jahr" : "Monat"}`;
  return short[f.status] ?? "?";
};
const priceCell = (planId: string) =>
  c.plan_prices
    .filter((p) => p.plan_id === planId)
    .map((p) => `${formatEuro(p.amount_cents)} ${{ monthly: "mtl.", annual: "/Mon. (12 M.)", biennial: "/Mon. (24 M.)", one_time: "einmalig" }[p.billing_period]}${p.confidence === "conflicting" ? " ⚠" : ""}`)
    .join("<br>");

const lines = [
  "# Dataset summary",
  "",
  `Generated from \`src/data/catalogue/*.json\`. All sources fetched and verified on ${[...new Set(c.sources.map((s) => s.verified_at))].join(", ")} (Europe/Berlin).`,
  "",
  "Legend: ✓ supported (vendor documentation) · ✗ not supported · ◐ only under conditions · ? unknown (not documented in the checked sources) · ⚠ price source contradicts itself. Prices are **net** (zzgl. MwSt.) list prices; promotions are not included.",
  "Nothing here is `tested` yet — all claims are documentation-only until Day 4 test runs exist.",
  "",
  `| Plan | Price (net) | ${keys.map((k) => c.features.find((f) => f.key === k)?.label_de ?? k).join(" | ")} |`,
  `|---|---|${keys.map(() => "---").join("|")}|`,
  ...c.plans.map((p) => `| ${p.name} | ${priceCell(p.id)} | ${keys.map((k) => cell(p.id, k)).join(" | ")} |`),
  "",
  "## Unknowns and conditions",
  "",
  ...c.plan_features
    .filter((f) => f.status === "unknown" || f.status === "conditional")
    .map((f) => `- **${f.plan_id} / ${f.feature_key}** — ${f.status}: ${f.conditions ?? "no note"}`),
  "",
  "## Price conflicts and promotions",
  "",
  ...[...new Set(c.plan_prices.filter((p) => p.conflict_note).map((p) => p.conflict_note))].map((n) => `- ⚠ ${n}`),
  ...[...new Set(c.plan_prices.filter((p) => p.promo).map((p) => p.promo!.description))].map(
    (d) =>
      `- Promo (not applied in totals): ${d} — plans: ${[...new Set(c.plan_prices.filter((p) => p.promo?.description === d).map((p) => p.plan_id))].join(", ")}`,
  ),
  "",
  "## Sources",
  "",
  ...c.sources.map((s) => `- \`${s.id}\` — [${s.title}](${s.url}) — ${s.publisher}; published ${s.published_at ?? "n/a"}; verified ${s.verified_at}; method ${s.fetch_method}. ${s.short_note}`),
  "",
  "## Affiliate programmes (commercial metadata, never used for ranking)",
  "",
  ...c.affiliate_programs.map((a) => `- ${a.vendor_id} via ${a.network}: **${a.status}** — ${a.rate_description} (source \`${a.terms_source_id}\`)`),
  "",
];
writeFileSync("docs/DATASET.md", lines.join("\n"));
console.log("Wrote docs/DATASET.md");
