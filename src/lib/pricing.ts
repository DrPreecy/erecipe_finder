/**
 * pricing.ts — first-year cost maths. Pure functions, integer cents only.
 *
 * First-year total = subscription charges over 12 months + mandatory fees (+ usage charges, none modelled yet).
 * If anything needed is unknown, the total is marked incomplete and can never win a "cheapest" claim.
 */
import type { PlanPrice } from "./catalogue-schema";

/** German standard VAT rate, used only to DISPLAY a gross figure next to the net price. */
export const VAT_RATE_STANDARD = 0.19;

export interface CostSummary {
  priceId: string;
  billingPeriod: PlanPrice["billing_period"];
  /** Monthly (equivalent) net price in cents, or null if unknown / one-time. */
  monthlyNetCents: number | null;
  firstYearNetCents: number | null;
  firstYearGrossCents: number | null;
  minimumTermMonths: number | null;
  /** What you must pay at least over the minimum term (null = unknown). */
  minimumPayableNetCents: number | null;
  /** true when every number needed for the first-year total is known */
  complete: boolean;
  /** complete AND not contradicted by the source → may be used for cheapest claims */
  comparable: boolean;
  promoApplied: boolean;
  notes: string[];
}

export interface CostOptions {
  /** Apply a promotion only if the visitor's eligibility is known. Default: false. */
  applyPromo?: boolean;
}

export function toGrossCents(netCents: number, vatBasis: PlanPrice["vat_basis"]): number {
  if (vatBasis === "net") return Math.round(netCents * (1 + VAT_RATE_STANDARD));
  return netCents; // already gross, or VAT not applicable (e.g. free open-source software)
}

export function firstYearCost(price: PlanPrice, options: CostOptions = {}): CostSummary {
  const notes: string[] = [];
  const amount = price.amount_cents;
  const fees = price.mandatory_fees_cents;
  let complete = true;

  if (amount === null) {
    complete = false;
    notes.push("Preis unbekannt.");
  }
  if (fees === null) {
    complete = false;
    notes.push("Pflichtgebühren nicht angegeben – Jahressumme unvollständig.");
  }

  let firstYearNet: number | null = null;
  let promoApplied = false;

  if (amount !== null) {
    if (price.billing_period === "one_time") {
      firstYearNet = amount;
    } else {
      const promo = price.promo;
      const canApplyPromo =
        options.applyPromo === true &&
        promo !== null &&
        promo.eligibility !== null &&
        promo.amount_cents !== null &&
        promo.duration_months !== null;
      if (canApplyPromo) {
        const promoMonths = Math.min(promo.duration_months!, 12);
        firstYearNet = promo.amount_cents! * promoMonths + amount * (12 - promoMonths);
        promoApplied = true;
      } else {
        firstYearNet = amount * 12;
        if (promo) notes.push(`Aktion nicht eingerechnet: ${promo.description}.`);
      }
    }
    if (fees !== null) firstYearNet += fees;
  }

  let minimumPayable: number | null = null;
  if (amount !== null && fees !== null) {
    if (price.billing_period === "one_time") minimumPayable = amount + fees;
    else if (price.minimum_term_months !== null) minimumPayable = amount * price.minimum_term_months + fees;
  }
  if (price.minimum_term_months !== null && price.minimum_term_months > 12) {
    notes.push(`Mindestlaufzeit ${price.minimum_term_months} Monate.`);
  }
  if (price.billing_period === "annual" || price.billing_period === "biennial") {
    notes.push("Monatlicher Betrag ist ein Durchschnitt – Abbuchung im Voraus, nicht monatlich kündbar.");
  }
  if (price.confidence === "conflicting" && price.conflict_note) notes.push(`Widersprüchliche Quelle: ${price.conflict_note}`);

  const firstYearComplete = complete ? firstYearNet : null;
  return {
    priceId: price.id,
    billingPeriod: price.billing_period,
    monthlyNetCents: price.billing_period === "one_time" ? null : amount,
    firstYearNetCents: firstYearComplete,
    firstYearGrossCents: firstYearComplete === null ? null : toGrossCents(firstYearComplete, price.vat_basis),
    minimumTermMonths: price.minimum_term_months,
    minimumPayableNetCents: minimumPayable,
    complete,
    comparable: complete && price.confidence === "verified",
    promoApplied,
    notes,
  };
}

/**
 * Pick the price option used for ranking a plan.
 * - Optionally only consider monthly-cancellable (or one-time) options.
 * - Prefer comparable options, then the lowest first-year total, then a stable id.
 */
export function choosePriceForComparison(
  prices: PlanPrice[],
  { monthlyCancellableOnly = false }: { monthlyCancellableOnly?: boolean } = {},
): CostSummary | null {
  const eligible = prices.filter(
    (p) => !monthlyCancellableOnly || p.billing_period === "one_time" || p.minimum_term_months === 1,
  );
  const pool = eligible.length > 0 ? eligible : prices;
  const costs = pool.map((p) => firstYearCost(p));
  costs.sort(compareCosts);
  return costs[0] ?? null;
}

/** Comparable before non-comparable, complete before incomplete, cheaper first, then id. */
export function compareCosts(a: CostSummary, b: CostSummary): number {
  if (a.comparable !== b.comparable) return a.comparable ? -1 : 1;
  if (a.complete !== b.complete) return a.complete ? -1 : 1;
  const av = a.firstYearNetCents ?? Number.MAX_SAFE_INTEGER;
  const bv = b.firstYearNetCents ?? Number.MAX_SAFE_INTEGER;
  if (av !== bv) return av - bv;
  return a.priceId.localeCompare(b.priceId);
}

const euro = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
/** 790 → "7,90 €"; null → "unbekannt" */
export function formatEuro(cents: number | null): string {
  return cents === null ? "unbekannt" : euro.format(cents / 100);
}
