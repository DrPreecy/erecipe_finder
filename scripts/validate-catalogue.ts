/**
 * npm run validate
 * Validates every JSON table (Zod) and the relationships between them.
 * Runs automatically before `npm run build`, so broken provenance can't be deployed.
 */
import { loadCatalogue } from "../src/lib/catalogue";
import { checkIntegrity } from "../src/lib/integrity";

try {
  const catalogue = loadCatalogue();
  const problems = checkIntegrity(catalogue);
  if (problems.length > 0) {
    console.error(`✗ Catalogue has ${problems.length} problem(s):`);
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  const unknown = catalogue.plan_features.filter((f) => f.status === "unknown").length;
  const conflicting = catalogue.plan_prices.filter((p) => p.confidence === "conflicting").length;
  console.log(
    `✓ Catalogue OK: ${catalogue.vendors.length} vendors, ${catalogue.plans.length} plans, ` +
      `${catalogue.plan_features.length} feature facts (${unknown} unknown), ` +
      `${catalogue.plan_prices.length} prices (${conflicting} conflicting), ${catalogue.sources.length} sources.`,
  );
} catch (err) {
  console.error("✗ Catalogue failed schema validation:");
  console.error(err);
  process.exit(1);
}
