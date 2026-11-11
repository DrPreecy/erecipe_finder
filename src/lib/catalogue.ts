/**
 * catalogue.ts — loads the JSON "tables" from src/data/catalogue and validates them.
 *
 * This is the "catalogue adapter" from the plan: if the data later comes from Postgres,
 * only this file needs to change.
 */
import { CatalogueSchema, type Catalogue, type PublicCatalogue } from "./catalogue-schema";

import sources from "../data/catalogue/sources.json";
import vendors from "../data/catalogue/vendors.json";
import plans from "../data/catalogue/plans.json";
import plan_prices from "../data/catalogue/plan_prices.json";
import features from "../data/catalogue/features.json";
import plan_features from "../data/catalogue/plan_features.json";
import claim_sources from "../data/catalogue/claim_sources.json";
import fixtures from "../data/catalogue/fixtures.json";
import test_runs from "../data/catalogue/test_runs.json";
import claim_test_runs from "../data/catalogue/claim_test_runs.json";
import affiliate_programs from "../data/catalogue/affiliate_programs.json";
import affiliate_links from "../data/catalogue/affiliate_links.json";

/** Parse + validate the whole catalogue. Throws a readable ZodError if a record is malformed. */
export function loadCatalogue(): Catalogue {
  return CatalogueSchema.parse({
    sources,
    vendors,
    plans,
    plan_prices,
    features,
    plan_features,
    claim_sources,
    fixtures,
    test_runs,
    claim_test_runs,
    affiliate_programs,
    affiliate_links,
  });
}

/** Strip everything commercial. Only this object may be passed to the matcher. */
export function toPublicCatalogue(c: Catalogue): PublicCatalogue {
  return {
    sources: c.sources,
    vendors: c.vendors,
    plans: c.plans,
    plan_prices: c.plan_prices,
    features: c.features,
    plan_features: c.plan_features,
    claim_sources: c.claim_sources,
  };
}
