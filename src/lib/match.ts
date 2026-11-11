/**
 * match.ts — the deterministic finder logic (plan §4).
 *
 *  1. Answers → hard requirements + soft preferences   (normaliseAnswers)
 *  2. Each plan: every hard requirement → supported / conditional / unknown / unsupported
 *       - any unsupported           → "excluded"
 *       - any conditional/unknown   → "unresolved" (never shown as a confirmed fit)
 *       - all supported             → "confirmed"
 *  3. Order: preferences met ↓, comparable first-year cost ↑, plan id (stable tie-break).
 *     Visitors can switch to cost-first ordering.
 *
 * Input is a PublicCatalogue: there are no commission fields, so money paid to us
 * cannot change who is shown or in which order.
 */
import type { FeatureKey, FeatureStatus, PlanFeature, PublicCatalogue } from "./catalogue-schema";
import { choosePriceForComparison, compareCosts, type CostSummary } from "./pricing";

// ------------------------------------------------------------------ answers
export type Task = "receive" | "send" | "both";
export type FormatChoice = "xrechnung" | "zugferd" | "both" | "unsure";
export type Handover = "none" | "datev" | "raw_xml";
export type TriState = "yes" | "no" | "any";

export interface Answers {
  task: Task;
  format: FormatChoice;
  /** Outgoing invoices per month (only relevant when sending). */
  monthlyInvoices: number;
  handover: Handover;
  preferences: {
    /** "yes" = desktop/local preferred, "no" = cloud preferred, "any" = no preference */
    runLocally: TriState;
    monthlyCancellable: boolean;
    /** "yes" = wants bookkeeping/EÜR included, "no" = invoicing only, "any" */
    wantsBookkeeping: TriState;
    /** Net budget per month in cents, or null for "no budget". */
    maxMonthlyNetCents: number | null;
  };
  sort: "fit" | "cost";
}

export const DEFAULT_ANSWERS: Answers = {
  task: "both",
  format: "unsure",
  monthlyInvoices: 5,
  handover: "none",
  preferences: { runLocally: "any", monthlyCancellable: false, wantsBookkeeping: "any", maxMonthlyNetCents: null },
  sort: "fit",
};

// ------------------------------------------------------------------ requirements
export interface Requirement {
  id: string;
  label: string;
  /** "all": every feature must hold; "any": one is enough (used for "not sure" formats when sending). */
  mode: "all" | "any";
  features: FeatureKey[];
  /** For the volume check: outgoing invoices per month. */
  quotaPerMonth?: number;
}

export interface Preference {
  id: "runLocally" | "monthlyCancellable" | "wantsBookkeeping" | "budget";
  label: string;
}

const FORMAT_LABEL: Record<"xrechnung" | "zugferd", string> = { xrechnung: "XRechnung", zugferd: "ZUGFeRD" };

function formatsFor(format: FormatChoice): ("xrechnung" | "zugferd")[] {
  return format === "xrechnung" ? ["xrechnung"] : format === "zugferd" ? ["zugferd"] : ["xrechnung", "zugferd"];
}

export function normaliseAnswers(a: Answers): { hard: Requirement[]; soft: Preference[] } {
  const hard: Requirement[] = [];
  const formats = formatsFor(a.format);

  if (a.task === "receive" || a.task === "both") {
    // You can't choose what customers/suppliers send you, so "not sure" means: be able to read both.
    for (const f of formats) {
      hard.push({ id: `receive_${f}`, label: `${FORMAT_LABEL[f]} empfangen`, mode: "all", features: [`receive_${f}`] });
    }
  }
  if (a.task === "send" || a.task === "both") {
    if (a.format === "unsure") {
      hard.push({ id: "send_any", label: "E-Rechnung erstellen (XRechnung oder ZUGFeRD)", mode: "any", features: ["send_xrechnung", "send_zugferd"] });
    } else {
      for (const f of formats) {
        hard.push({ id: `send_${f}`, label: `${FORMAT_LABEL[f]} erstellen`, mode: "all", features: [`send_${f}`] });
      }
    }
    hard.push({
      id: "send_quota",
      label: `${a.monthlyInvoices} Rechnungen pro Monat`,
      mode: "all",
      features: ["send_quota"],
      quotaPerMonth: Math.max(0, Math.floor(a.monthlyInvoices)),
    });
  }
  if (a.handover === "datev") hard.push({ id: "datev_export", label: "DATEV-Export", mode: "all", features: ["datev_export"] });
  if (a.handover === "raw_xml")
    hard.push({ id: "raw_xml_export", label: "Original-XML herunterladen", mode: "all", features: ["raw_xml_export"] });

  const soft: Preference[] = [];
  if (a.preferences.runLocally === "yes") soft.push({ id: "runLocally", label: "Läuft lokal auf dem eigenen Rechner" });
  if (a.preferences.runLocally === "no") soft.push({ id: "runLocally", label: "Cloud-Lösung (im Browser)" });
  if (a.preferences.monthlyCancellable) soft.push({ id: "monthlyCancellable", label: "Monatlich kündbar" });
  if (a.preferences.wantsBookkeeping === "yes") soft.push({ id: "wantsBookkeeping", label: "Mit Buchhaltung/EÜR" });
  if (a.preferences.wantsBookkeeping === "no") soft.push({ id: "wantsBookkeeping", label: "Nur Rechnungen, ohne Buchhaltung" });
  if (a.preferences.maxMonthlyNetCents !== null) soft.push({ id: "budget", label: "Im Monatsbudget" });
  return { hard, soft };
}

// ------------------------------------------------------------------ evaluation helpers
const STATUS_RANK: Record<FeatureStatus, number> = { supported: 3, conditional: 2, unknown: 1, unsupported: 0 };

export const STATUS_LABEL_DE: Record<FeatureStatus, string> = {
  supported: "unterstützt",
  conditional: "nur unter Bedingungen",
  unknown: "unbekannt",
  unsupported: "nicht unterstützt",
};

function findFact(cat: PublicCatalogue, planId: string, key: FeatureKey): PlanFeature | undefined {
  return cat.plan_features.find((pf) => pf.plan_id === planId && pf.feature_key === key && pf.valid_to === null);
}

/** Missing facts count as "unknown" — never as supported. */
function factStatus(fact: PlanFeature | undefined): FeatureStatus {
  return fact?.status ?? "unknown";
}

function quotaStatus(fact: PlanFeature | undefined, perMonth: number): { status: FeatureStatus; note: string | null } {
  const status = factStatus(fact);
  if (status !== "supported" || !fact?.value) return { status, note: fact?.conditions ?? null };
  const { max, per } = fact.value;
  if (max === null) return { status: "supported", note: fact.conditions };
  const needed = per === "year" ? perMonth * 12 : perMonth;
  return max >= needed
    ? { status: "supported", note: fact.conditions }
    : { status: "unsupported", note: `Grenze ${max} pro ${per === "year" ? "Jahr" : "Monat"} – benötigt ${needed}.` };
}

export interface RequirementResult {
  requirement: Requirement;
  status: FeatureStatus;
  /** Conditions/limits from the catalogue, shown to the visitor. */
  notes: string[];
  evidence: ("documented" | "tested" | "none")[];
}

function evaluateRequirement(cat: PublicCatalogue, planId: string, req: Requirement): RequirementResult {
  const per = req.features.map((key) => {
    const fact = findFact(cat, planId, key);
    if (key === "send_quota" && req.quotaPerMonth !== undefined) {
      const q = quotaStatus(fact, req.quotaPerMonth);
      return { status: q.status, note: q.note, evidence: fact?.evidence_level ?? "none" };
    }
    return { status: factStatus(fact), note: fact?.conditions ?? null, evidence: fact?.evidence_level ?? "none" };
  });
  const ranks = per.map((p) => STATUS_RANK[p.status]);
  const target = req.mode === "all" ? Math.min(...ranks) : Math.max(...ranks);
  const status = (Object.keys(STATUS_RANK) as FeatureStatus[]).find((s) => STATUS_RANK[s] === target) ?? "unknown";
  const relevant = req.mode === "all" ? per : per.filter((p) => STATUS_RANK[p.status] === target);
  return {
    requirement: req,
    status,
    notes: relevant.map((p) => p.note).filter((n): n is string => !!n),
    evidence: relevant.map((p) => p.evidence),
  };
}

// ------------------------------------------------------------------ result types
export type Fit = "confirmed" | "unresolved" | "excluded";

export interface PlanResult {
  planId: string;
  planName: string;
  vendorId: string;
  vendorName: string;
  fit: Fit;
  requirements: RequirementResult[];
  preferencesMet: Preference[];
  preferencesMissed: Preference[];
  cost: CostSummary | null;
  /** Short German sentences explaining the outcome. */
  explanation: string[];
}

export interface MatchResult {
  confirmed: PlanResult[];
  unresolved: PlanResult[];
  excluded: PlanResult[];
  /** German description of the active ordering, displayed next to the results. */
  orderDescription: string;
  /** Present when nothing is a confirmed fit. */
  noFitExplanation: string | null;
}

// ------------------------------------------------------------------ main entry
export function matchPlans(cat: PublicCatalogue, answers: Answers): MatchResult {
  const { hard, soft } = normaliseAnswers(answers);
  const results: PlanResult[] = [];

  for (const plan of cat.plans) {
    if (plan.status !== "active") continue;
    const vendor = cat.vendors.find((v) => v.id === plan.vendor_id);
    if (!vendor?.active) continue;

    const reqResults = hard.map((r) => evaluateRequirement(cat, plan.id, r));
    const fit: Fit = reqResults.some((r) => r.status === "unsupported")
      ? "excluded"
      : reqResults.every((r) => r.status === "supported")
        ? "confirmed"
        : "unresolved";

    const prices = cat.plan_prices.filter((p) => p.plan_id === plan.id && p.effective_to === null);
    const cost = choosePriceForComparison(prices, { monthlyCancellableOnly: answers.preferences.monthlyCancellable });

    const met: Preference[] = [];
    const missed: Preference[] = [];
    for (const pref of soft) (preferenceMet(cat, plan.id, pref, answers, prices, cost) ? met : missed).push(pref);

    results.push({
      planId: plan.id,
      planName: plan.name,
      vendorId: vendor.id,
      vendorName: vendor.name,
      fit,
      requirements: reqResults,
      preferencesMet: met,
      preferencesMissed: missed,
      cost,
      explanation: explain(fit, reqResults, met, missed),
    });
  }

  const byFit = (a: PlanResult, b: PlanResult) =>
    b.preferencesMet.length - a.preferencesMet.length || costOrder(a, b) || a.planId.localeCompare(b.planId);
  const byCost = (a: PlanResult, b: PlanResult) =>
    costOrder(a, b) || b.preferencesMet.length - a.preferencesMet.length || a.planId.localeCompare(b.planId);
  const order = answers.sort === "cost" ? byCost : byFit;

  const confirmed = results.filter((r) => r.fit === "confirmed").sort(order);
  const unresolved = results.filter((r) => r.fit === "unresolved").sort(order);
  const excluded = results.filter((r) => r.fit === "excluded").sort((a, b) => a.planId.localeCompare(b.planId));

  return {
    confirmed,
    unresolved,
    excluded,
    orderDescription:
      answers.sort === "cost"
        ? "Sortiert nach Kosten im ersten Jahr (netto; unvollständige oder widersprüchliche Preise zuletzt), dann nach erfüllten Wünschen."
        : "Sortiert nach erfüllten Wünschen, dann nach Kosten im ersten Jahr (netto), dann alphabetisch. Provisionen spielen keine Rolle.",
    noFitExplanation: confirmed.length > 0 ? null : explainNoFit(hard, results),
  };
}

function costOrder(a: PlanResult, b: PlanResult): number {
  if (a.cost && b.cost) return compareCosts(a.cost, b.cost);
  if (a.cost) return -1;
  if (b.cost) return 1;
  return 0;
}

function preferenceMet(
  cat: PublicCatalogue,
  planId: string,
  pref: Preference,
  answers: Answers,
  prices: PublicCatalogue["plan_prices"],
  cost: CostSummary | null,
): boolean {
  switch (pref.id) {
    case "runLocally": {
      const local = factStatus(findFact(cat, planId, "runs_locally"));
      return answers.preferences.runLocally === "yes" ? local === "supported" : local === "unsupported";
    }
    case "monthlyCancellable":
      return prices.some((p) => p.billing_period === "one_time" || p.minimum_term_months === 1);
    case "wantsBookkeeping": {
      const s = factStatus(findFact(cat, planId, "bookkeeping_euer"));
      return answers.preferences.wantsBookkeeping === "yes" ? s === "supported" : s === "unsupported";
    }
    case "budget": {
      const budget = answers.preferences.maxMonthlyNetCents;
      if (budget === null || !cost?.complete || cost.firstYearNetCents === null) return false;
      return Math.ceil(cost.firstYearNetCents / 12) <= budget;
    }
  }
}

function explain(fit: Fit, reqs: RequirementResult[], met: Preference[], missed: Preference[]): string[] {
  const lines: string[] = [];
  if (fit === "confirmed") lines.push("Erfüllt alle Muss-Kriterien laut aktueller Anbieterdokumentation.");
  for (const r of reqs) {
    if (r.status === "supported") continue;
    const verb = r.status === "unsupported" ? "Ausschlussgrund" : "Ungeklärt";
    lines.push(`${verb}: ${r.requirement.label} – ${STATUS_LABEL_DE[r.status]}${r.notes.length ? ` (${r.notes.join(" ")})` : ""}.`);
  }
  if (met.length) lines.push(`Erfüllte Wünsche: ${met.map((p) => p.label).join(", ")}.`);
  if (missed.length) lines.push(`Nicht erfüllte Wünsche: ${missed.map((p) => p.label).join(", ")}.`);
  return lines;
}

function explainNoFit(hard: Requirement[], results: PlanResult[]): string {
  if (results.length === 0) return "Der Katalog enthält noch keine Tarife.";
  const blocking = hard.filter((req) =>
    results.every((r) => r.requirements.find((x) => x.requirement.id === req.id)?.status !== "supported"),
  );
  const labels = blocking.map((b) => b.label).join(", ");
  const unresolvedCount = results.filter((r) => r.fit === "unresolved").length;
  return (
    `Kein Tarif in unserem Katalog erfüllt nachweislich alle Muss-Kriterien.` +
    (labels ? ` Kein Tarif ist dokumentiert für: ${labels}.` : "") +
    (unresolvedCount ? ` ${unresolvedCount} Tarif(e) sind möglich, aber ungeklärt – siehe unten.` : "") +
    " Du kannst ein Kriterium lockern oder die Angaben ändern."
  );
}
