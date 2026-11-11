/**
 * catalogue-schema.ts — the "data contract" of the whole project.
 *
 * Every JSON file in src/data/catalogue/ is validated against these Zod schemas.
 * The shapes mirror the SQL blueprint in db/migrations/001_init.sql so that a later
 * move to Postgres (v2) is a mechanical import, not a redesign.
 *
 * Golden rules (from the product plan):
 *  - Unknown is a real value. Never turn "unknown" into "supported".
 *  - Unknown money is `null`, never `0`.
 *  - Every published fact points to a source with a URL and a verified date.
 *  - "tested" is only allowed when a real, dated test run exists.
 */
import { z } from "zod";

/** ISO date like "2026-11-11" (dates are stored in Europe/Berlin calendar days). */
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");
const id = z.string().regex(/^[a-z0-9][a-z0-9-]*$/, "ids are lowercase-kebab-case");
const httpsUrl = z.url().refine((u) => u.startsWith("https://"), "only https URLs");

// ---------------------------------------------------------------- sources
export const SourceSchema = z.object({
  id,
  url: httpsUrl,
  title: z.string().min(1),
  publisher: z.string().min(1),
  kind: z.enum([
    "vendor_pricing",
    "vendor_help",
    "vendor_product",
    "vendor_affiliate",
    "affiliate_network",
    "project_readme",
    "project_release_notes",
    "project_website",
  ]),
  /** Publication date if the page states one; otherwise null (never "today"). */
  published_at: isoDate.nullable(),
  accessed_at: isoDate,
  verified_at: isoDate,
  /** How the page was read. "raw_html" = same URL, but rendered tables (check marks) read from HTML. */
  fetch_method: z.enum(["webfetch", "webfetch+raw_html"]),
  short_note: z.string().min(1),
});

// ---------------------------------------------------------------- vendors & plans
export const VendorSchema = z.object({
  id,
  slug: id,
  name: z.string().min(1),
  website_url: httpsUrl,
  market: z.literal("DE"),
  kind: z.enum(["saas", "desktop_open_source"]),
  active: z.boolean(),
});

export const PlanSchema = z.object({
  id,
  vendor_id: id,
  slug: id,
  name: z.string().min(1),
  /** SaaS products rarely expose a version: keep null ("version not provided"). */
  app_version: z.string().nullable(),
  status: z.enum(["active", "discontinued"]),
  observed_at: isoDate,
  valid_from: isoDate.nullable(),
  valid_to: isoDate.nullable(),
});

// ---------------------------------------------------------------- prices
export const PromoSchema = z.object({
  description: z.string().min(1),
  /** Promotional amount per month (net cents) — null if not stated. */
  amount_cents: z.number().int().nonnegative().nullable(),
  duration_months: z.number().int().positive().nullable(),
  /** Who qualifies. null = not stated → the promo is never applied automatically. */
  eligibility: z.string().nullable(),
});

export const PlanPriceSchema = z.object({
  id,
  plan_id: id,
  currency: z.literal("EUR"),
  billing_period: z.enum(["one_time", "monthly", "annual", "biennial"]),
  /** For recurring prices: the monthly (equivalent) amount in cents. For one_time: the total. null = unknown. */
  amount_cents: z.number().int().nonnegative().nullable(),
  vat_basis: z.enum(["net", "gross", "not_applicable"]),
  /** Minimum contract length in months; null = unknown. 1 = monthly cancellable. */
  minimum_term_months: z.number().int().positive().nullable(),
  /** Mandatory set-up/other fees in cents; null = unknown, 0 = source says there are none. */
  mandatory_fees_cents: z.number().int().nonnegative().nullable(),
  promo: PromoSchema.nullable(),
  renewal_amount_cents: z.number().int().nonnegative().nullable(),
  /** "conflicting" = the source shows contradictory numbers; such a price can never win a cheapest claim. */
  confidence: z.enum(["verified", "conflicting"]),
  conflict_note: z.string().nullable(),
  source_id: id,
  verified_at: isoDate,
  effective_from: isoDate.nullable(),
  effective_to: isoDate.nullable(),
});

// ---------------------------------------------------------------- features
export const FEATURE_KEYS = [
  "receive_xrechnung",
  "receive_zugferd",
  "validate_incoming",
  "send_xrechnung",
  "send_zugferd",
  "send_quota",
  "raw_xml_export",
  "datev_export",
  "tax_advisor_access",
  "bookkeeping_euer",
  "public_api",
  "runs_locally",
] as const;
export const FeatureKeySchema = z.enum(FEATURE_KEYS);
export type FeatureKey = z.infer<typeof FeatureKeySchema>;

export const FeatureSchema = z.object({
  id,
  key: FeatureKeySchema,
  label_de: z.string().min(1),
  description_de: z.string().min(1),
  category: z.enum(["receive", "send", "handover", "workflow", "deployment"]),
  value_type: z.enum(["boolean", "quota"]),
  unit: z.string().nullable(),
});

export const FeatureStatusSchema = z.enum(["supported", "unsupported", "conditional", "unknown"]);
export type FeatureStatus = z.infer<typeof FeatureStatusSchema>;

export const QuotaValueSchema = z.object({
  /** null = documented as unlimited */
  max: z.number().int().positive().nullable(),
  per: z.enum(["month", "year"]),
});

export const PlanFeatureSchema = z.object({
  id,
  plan_id: id,
  feature_key: FeatureKeySchema,
  status: FeatureStatusSchema,
  value: QuotaValueSchema.nullable(),
  /** Human-readable conditions/limits, in German, shown to visitors. */
  conditions: z.string().nullable(),
  /** "documented" = vendor documentation says so. "tested" = our own dated test run (needs claim_test_runs). */
  evidence_level: z.enum(["documented", "tested", "none"]),
  reviewed_at: isoDate,
  valid_from: isoDate.nullable(),
  valid_to: isoDate.nullable(),
});

export const ClaimSourceSchema = z
  .object({
    id,
    source_id: id,
    plan_feature_id: id.nullable(),
    plan_price_id: id.nullable(),
    supporting_note: z.string().min(1),
  })
  .refine(
    (c) => (c.plan_feature_id === null) !== (c.plan_price_id === null),
    "a claim_source must point to exactly one claim (feature XOR price)",
  );

// ---------------------------------------------------------------- tests & fixtures (Day 4)
export const FixtureSchema = z.object({
  id,
  slug: id,
  format: z.enum(["xrechnung_ubl", "xrechnung_cii", "zugferd_pdf"]),
  profile: z.string().min(1),
  specification_version: z.string().min(1),
  file_path: z.string().min(1),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  expected_outcome: z.enum(["valid", "invalid"]),
  synthetic: z.literal(true),
  licence: z.string().min(1),
  created_at: isoDate,
});

export const TestRunSchema = z.object({
  id,
  plan_id: id,
  fixture_id: id,
  workflow: z.enum(["import", "export", "validate"]),
  app_version: z.string().nullable(),
  run_at: z.string().min(1),
  validator_version: z.string().nullable(),
  ruleset_version: z.string().nullable(),
  result: z.enum(["pass", "fail", "blocked"]),
  observations: z.string().min(1),
  artifact_path: z.string().nullable(),
  artifact_sha256: z.string().nullable(),
  tester: z.string().min(1),
});

export const ClaimTestRunSchema = z.object({
  plan_feature_id: id,
  test_run_id: id,
  scope_note: z.string().min(1),
});

// ---------------------------------------------------------------- commercial (never matcher input!)
export const AffiliateProgramSchema = z.object({
  id,
  vendor_id: id,
  network: z.string().min(1),
  status: z.enum(["not_applied", "pending", "approved", "rejected"]),
  rate_description: z.string().min(1),
  terms_source_id: id,
  verified_at: isoDate,
});

export const AffiliateLinkSchema = z.object({
  id,
  vendor_id: id,
  program_id: id.nullable(),
  plan_id: id.nullable(),
  destination_url: httpsUrl,
  /** Only filled after a programme is approved. Until then visitors get the ordinary link. */
  approved_tracking_url: httpsUrl.nullable(),
  disclosure_label: z.string().nullable(),
  status: z.enum(["ordinary", "affiliate_active"]),
  checked_at: isoDate,
});

// ---------------------------------------------------------------- whole catalogue
export const CatalogueSchema = z.object({
  sources: z.array(SourceSchema),
  vendors: z.array(VendorSchema),
  plans: z.array(PlanSchema),
  plan_prices: z.array(PlanPriceSchema),
  features: z.array(FeatureSchema),
  plan_features: z.array(PlanFeatureSchema),
  claim_sources: z.array(ClaimSourceSchema),
  fixtures: z.array(FixtureSchema),
  test_runs: z.array(TestRunSchema),
  claim_test_runs: z.array(ClaimTestRunSchema),
  affiliate_programs: z.array(AffiliateProgramSchema),
  affiliate_links: z.array(AffiliateLinkSchema),
});

export type Source = z.infer<typeof SourceSchema>;
export type Vendor = z.infer<typeof VendorSchema>;
export type Plan = z.infer<typeof PlanSchema>;
export type PlanPrice = z.infer<typeof PlanPriceSchema>;
export type Feature = z.infer<typeof FeatureSchema>;
export type PlanFeature = z.infer<typeof PlanFeatureSchema>;
export type ClaimSource = z.infer<typeof ClaimSourceSchema>;
export type AffiliateProgram = z.infer<typeof AffiliateProgramSchema>;
export type AffiliateLink = z.infer<typeof AffiliateLinkSchema>;
export type Catalogue = z.infer<typeof CatalogueSchema>;

/**
 * The PUBLIC catalogue is what the matcher is allowed to see.
 * It deliberately has no affiliate fields: commission can't influence ranking
 * because the ranking code never receives it (plan §4 "Affiliate independence").
 */
export type PublicCatalogue = Pick<
  Catalogue,
  "sources" | "vendors" | "plans" | "plan_prices" | "features" | "plan_features" | "claim_sources"
>;
