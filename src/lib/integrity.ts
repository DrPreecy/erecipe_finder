/**
 * integrity.ts — checks that Zod alone can't do (relationships between tables).
 * Used by `npm run validate` (and therefore by `npm run build`) and by the tests.
 * Returns a list of human-readable problems; an empty list means the catalogue is OK.
 */
import type { Catalogue } from "./catalogue-schema";

export function checkIntegrity(c: Catalogue): string[] {
  const problems: string[] = [];
  const ids = <T extends { id: string }>(rows: T[]) => new Set(rows.map((r) => r.id));

  const sourceIds = ids(c.sources);
  const vendorIds = ids(c.vendors);
  const planIds = ids(c.plans);
  const priceIds = ids(c.plan_prices);
  const featureKeys = new Set(c.features.map((f) => f.key));
  const pfIds = ids(c.plan_features);
  const testRunIds = ids(c.test_runs);
  const fixtureIds = ids(c.fixtures);
  const programIds = ids(c.affiliate_programs);

  // Unique ids per table
  for (const [name, rows] of Object.entries(c)) {
    const seen = new Set<string>();
    for (const r of rows as { id?: string }[]) {
      if (!r.id) continue;
      if (seen.has(r.id)) problems.push(`${name}: duplicate id "${r.id}"`);
      seen.add(r.id);
    }
  }

  for (const p of c.plans) if (!vendorIds.has(p.vendor_id)) problems.push(`plan ${p.id}: unknown vendor ${p.vendor_id}`);

  for (const pr of c.plan_prices) {
    if (!planIds.has(pr.plan_id)) problems.push(`price ${pr.id}: unknown plan ${pr.plan_id}`);
    if (!sourceIds.has(pr.source_id)) problems.push(`price ${pr.id}: unknown source ${pr.source_id}`);
    if (pr.confidence === "conflicting" && !pr.conflict_note) problems.push(`price ${pr.id}: conflicting price needs a conflict_note`);
  }

  // One active fact per plan + feature (the "partial unique index" from the SQL blueprint)
  const seenPf = new Set<string>();
  for (const pf of c.plan_features) {
    if (!planIds.has(pf.plan_id)) problems.push(`plan_feature ${pf.id}: unknown plan ${pf.plan_id}`);
    if (!featureKeys.has(pf.feature_key)) problems.push(`plan_feature ${pf.id}: feature ${pf.feature_key} not in features.json`);
    const key = `${pf.plan_id}/${pf.feature_key}`;
    if (pf.valid_to === null) {
      if (seenPf.has(key)) problems.push(`plan_feature ${pf.id}: second active fact for ${key}`);
      seenPf.add(key);
    }
    const feature = c.features.find((f) => f.key === pf.feature_key);
    if (feature?.value_type === "quota" && pf.status === "supported" && pf.value === null)
      problems.push(`plan_feature ${pf.id}: supported quota needs a value`);
  }

  // Provenance: every non-unknown fact needs at least one source; every price needs its claim_source.
  const sourcedFacts = new Set<string>();
  for (const cs of c.claim_sources) {
    if (!sourceIds.has(cs.source_id)) problems.push(`claim_source ${cs.id}: unknown source ${cs.source_id}`);
    if (cs.plan_feature_id) {
      if (!pfIds.has(cs.plan_feature_id)) problems.push(`claim_source ${cs.id}: unknown plan_feature ${cs.plan_feature_id}`);
      sourcedFacts.add(cs.plan_feature_id);
    }
    if (cs.plan_price_id) {
      if (!priceIds.has(cs.plan_price_id)) problems.push(`claim_source ${cs.id}: unknown price ${cs.plan_price_id}`);
      sourcedFacts.add(cs.plan_price_id);
    }
  }
  for (const pf of c.plan_features) {
    if (pf.status !== "unknown" && !sourcedFacts.has(pf.id)) problems.push(`plan_feature ${pf.id}: status "${pf.status}" has no source`);
    if (pf.status === "unknown" && pf.evidence_level !== "none") problems.push(`plan_feature ${pf.id}: unknown facts must have evidence_level "none"`);
  }
  for (const pr of c.plan_prices) if (!sourcedFacts.has(pr.id)) problems.push(`price ${pr.id}: no claim_source`);

  // "tested" badge only with a real test run
  for (const pf of c.plan_features) {
    if (pf.evidence_level !== "tested") continue;
    const runs = c.claim_test_runs.filter((r) => r.plan_feature_id === pf.id);
    if (runs.length === 0) problems.push(`plan_feature ${pf.id}: labelled "tested" without a test run`);
  }
  for (const r of c.claim_test_runs) {
    if (!pfIds.has(r.plan_feature_id)) problems.push(`claim_test_run: unknown plan_feature ${r.plan_feature_id}`);
    if (!testRunIds.has(r.test_run_id)) problems.push(`claim_test_run: unknown test_run ${r.test_run_id}`);
  }
  for (const t of c.test_runs) {
    if (!planIds.has(t.plan_id)) problems.push(`test_run ${t.id}: unknown plan ${t.plan_id}`);
    if (!fixtureIds.has(t.fixture_id)) problems.push(`test_run ${t.id}: unknown fixture ${t.fixture_id}`);
  }

  // Commercial tables
  for (const a of c.affiliate_programs) {
    if (!vendorIds.has(a.vendor_id)) problems.push(`affiliate_program ${a.id}: unknown vendor`);
    if (!sourceIds.has(a.terms_source_id)) problems.push(`affiliate_program ${a.id}: unknown terms source`);
  }
  for (const l of c.affiliate_links) {
    if (!vendorIds.has(l.vendor_id)) problems.push(`affiliate_link ${l.id}: unknown vendor`);
    if (l.program_id && !programIds.has(l.program_id)) problems.push(`affiliate_link ${l.id}: unknown program`);
    if (l.status === "affiliate_active") {
      const program = c.affiliate_programs.find((p) => p.id === l.program_id);
      if (program?.status !== "approved") problems.push(`affiliate_link ${l.id}: active affiliate link without an approved programme`);
      if (!l.approved_tracking_url || !l.disclosure_label) problems.push(`affiliate_link ${l.id}: active affiliate link needs tracking URL + disclosure label`);
    }
  }
  return problems;
}
