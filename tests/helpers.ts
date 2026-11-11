import { loadCatalogue, toPublicCatalogue } from "../src/lib/catalogue";
import type { Catalogue, PublicCatalogue } from "../src/lib/catalogue-schema";
import { DEFAULT_ANSWERS, type Answers } from "../src/lib/match";

export const realCatalogue = (): Catalogue => loadCatalogue();
export const realPublic = (): PublicCatalogue => toPublicCatalogue(loadCatalogue());

/** Build answers from the defaults with a few overrides. */
export function answers(overrides: Partial<Omit<Answers, "preferences">> & { preferences?: Partial<Answers["preferences"]> } = {}): Answers {
  return {
    ...DEFAULT_ANSWERS,
    ...overrides,
    preferences: { ...DEFAULT_ANSWERS.preferences, ...(overrides.preferences ?? {}) },
  };
}

/** A tiny synthetic catalogue for edge cases (ties, no-fit). */
export function syntheticCatalogue(): PublicCatalogue {
  const d = "2026-11-11";
  const plan = (id: string) => ({ id, vendor_id: "v", slug: id, name: id, app_version: null, status: "active" as const, observed_at: d, valid_from: null, valid_to: null });
  const price = (id: string, plan_id: string, cents: number) => ({
    id, plan_id, currency: "EUR" as const, billing_period: "monthly" as const, amount_cents: cents, vat_basis: "net" as const,
    minimum_term_months: 1, mandatory_fees_cents: 0, promo: null, renewal_amount_cents: cents, confidence: "verified" as const,
    conflict_note: null, source_id: "s", verified_at: d, effective_from: null, effective_to: null,
  });
  const fact = (plan_id: string, feature_key: "receive_xrechnung" | "receive_zugferd", status: "supported" | "unknown") => ({
    id: `${plan_id}--${feature_key}`, plan_id, feature_key, status, value: null, conditions: null,
    evidence_level: status === "unknown" ? ("none" as const) : ("documented" as const), reviewed_at: d, valid_from: null, valid_to: null,
  });
  return {
    sources: [{ id: "s", url: "https://example.org/", title: "t", publisher: "p", kind: "vendor_pricing", published_at: null, accessed_at: d, verified_at: d, fetch_method: "webfetch", short_note: "n" }],
    vendors: [{ id: "v", slug: "v", name: "V", website_url: "https://example.org/", market: "DE", kind: "saas", active: true }],
    plans: [plan("plan-b"), plan("plan-a"), plan("plan-c")],
    plan_prices: [price("p-b", "plan-b", 500), price("p-a", "plan-a", 500), price("p-c", "plan-c", 100)],
    features: [],
    plan_features: [
      fact("plan-a", "receive_xrechnung", "supported"), fact("plan-a", "receive_zugferd", "supported"),
      fact("plan-b", "receive_xrechnung", "supported"), fact("plan-b", "receive_zugferd", "supported"),
      fact("plan-c", "receive_xrechnung", "supported"), fact("plan-c", "receive_zugferd", "unknown"),
    ],
    claim_sources: [],
  };
}
