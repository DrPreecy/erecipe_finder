import { describe, expect, it } from "vitest";
import type { PlanPrice } from "../src/lib/catalogue-schema";
import { choosePriceForComparison, firstYearCost, formatEuro, toGrossCents } from "../src/lib/pricing";

const base: PlanPrice = {
  id: "p", plan_id: "x", currency: "EUR", billing_period: "monthly", amount_cents: 790, vat_basis: "net",
  minimum_term_months: 1, mandatory_fees_cents: 0, promo: null, renewal_amount_cents: 790, confidence: "verified",
  conflict_note: null, source_id: "s", verified_at: "2026-11-11", effective_from: null, effective_to: null,
};

describe("firstYearCost", () => {
  it("monthly: 12 × price + fees, in integer cents", () => {
    const c = firstYearCost(base);
    expect(c.firstYearNetCents).toBe(9480);
    expect(c.firstYearGrossCents).toBe(11281); // 9480 × 1.19 = 11281.2 → rounded
    expect(c.minimumPayableNetCents).toBe(790);
    expect(c.comparable).toBe(true);
  });
  it("adds mandatory fees", () => {
    expect(firstYearCost({ ...base, mandatory_fees_cents: 4900 }).firstYearNetCents).toBe(9480 + 4900);
  });
  it("unknown fees → incomplete, no total, not comparable", () => {
    const c = firstYearCost({ ...base, mandatory_fees_cents: null });
    expect(c.complete).toBe(false);
    expect(c.firstYearNetCents).toBeNull();
    expect(c.comparable).toBe(false);
  });
  it("unknown price stays null (never 0)", () => {
    const c = firstYearCost({ ...base, amount_cents: null });
    expect(c.firstYearNetCents).toBeNull();
    expect(formatEuro(c.firstYearNetCents)).toBe("unbekannt");
  });
  it("conflicting source → complete but not comparable", () => {
    const c = firstYearCost({ ...base, confidence: "conflicting", conflict_note: "x" });
    expect(c.complete).toBe(true);
    expect(c.comparable).toBe(false);
  });
  it("promotion is NOT applied when eligibility is unknown", () => {
    const promo = { description: "50 % für 3 Monate", amount_cents: 395, duration_months: 3, eligibility: null };
    const c = firstYearCost({ ...base, promo }, { applyPromo: true });
    expect(c.promoApplied).toBe(false);
    expect(c.firstYearNetCents).toBe(9480);
    expect(c.notes.join(" ")).toMatch(/Aktion nicht eingerechnet/);
  });
  it("promotion is applied only when eligibility is known and requested", () => {
    const promo = { description: "50 % für 3 Monate", amount_cents: 395, duration_months: 3, eligibility: "Neukunden" };
    expect(firstYearCost({ ...base, promo }).firstYearNetCents).toBe(9480);
    const c = firstYearCost({ ...base, promo }, { applyPromo: true });
    expect(c.firstYearNetCents).toBe(395 * 3 + 790 * 9);
  });
  it("biennial: monthly equivalent × 24 is the minimum payable amount", () => {
    const c = firstYearCost({ ...base, billing_period: "biennial", amount_cents: 890, minimum_term_months: 24 });
    expect(c.firstYearNetCents).toBe(890 * 12);
    expect(c.minimumPayableNetCents).toBe(890 * 24);
    expect(c.notes.join(" ")).toMatch(/Mindestlaufzeit 24 Monate/);
  });
  it("one-time free software", () => {
    const c = firstYearCost({ ...base, billing_period: "one_time", amount_cents: 0, vat_basis: "not_applicable", minimum_term_months: null });
    expect(c.firstYearNetCents).toBe(0);
    expect(c.firstYearGrossCents).toBe(0);
    expect(c.monthlyNetCents).toBeNull();
  });
});

describe("choosePriceForComparison", () => {
  const monthly = { ...base, id: "m", amount_cents: 1190 };
  const biennial = { ...base, id: "b", billing_period: "biennial" as const, amount_cents: 890, minimum_term_months: 24 };
  it("picks the cheapest first-year option", () => {
    expect(choosePriceForComparison([monthly, biennial])?.priceId).toBe("b");
  });
  it("respects 'monthly cancellable only'", () => {
    expect(choosePriceForComparison([monthly, biennial], { monthlyCancellableOnly: true })?.priceId).toBe("m");
  });
  it("returns null when there is no price", () => {
    expect(choosePriceForComparison([])).toBeNull();
  });
});

describe("formatting", () => {
  it("formats cents as German euro", () => {
    expect(formatEuro(790).replace(/\s/g, " ")).toBe("7,90 €");
  });
  it("gross only for net prices", () => {
    expect(toGrossCents(1000, "net")).toBe(1190);
    expect(toGrossCents(1000, "gross")).toBe(1000);
  });
});
