import { describe, expect, it } from "vitest";
import { matchPlans, normaliseAnswers } from "../src/lib/match";
import { toPublicCatalogue } from "../src/lib/catalogue";
import { answers, realCatalogue, realPublic, syntheticCatalogue } from "./helpers";

const ids = (rs: { planId: string }[]) => rs.map((r) => r.planId);

describe("normaliseAnswers", () => {
  it("'not sure' + receive requires BOTH formats, + send accepts EITHER", () => {
    const { hard } = normaliseAnswers(answers({ task: "both", format: "unsure" }));
    expect(hard.map((h) => h.id)).toEqual(["receive_xrechnung", "receive_zugferd", "send_any", "send_quota"]);
    expect(hard.find((h) => h.id === "send_any")?.mode).toBe("any");
  });
  it("receive-only answers have no volume requirement", () => {
    const { hard } = normaliseAnswers(answers({ task: "receive", format: "xrechnung" }));
    expect(hard.map((h) => h.id)).toEqual(["receive_xrechnung"]);
  });
});

describe("matchPlans — determinism and stability", () => {
  it("same input → same output, every time", () => {
    const a = answers({ task: "both", format: "both", monthlyInvoices: 10 });
    const first = JSON.stringify(matchPlans(realPublic(), a));
    for (let i = 0; i < 5; i++) expect(JSON.stringify(matchPlans(realPublic(), a))).toBe(first);
  });
  it("does not depend on the order of plans in the catalogue", () => {
    const cat = realPublic();
    const reversed = { ...cat, plans: [...cat.plans].reverse(), plan_features: [...cat.plan_features].reverse() };
    const a = answers({ task: "receive", format: "both" });
    expect(ids(matchPlans(reversed, a).confirmed)).toEqual(ids(matchPlans(cat, a).confirmed));
  });
  it("ties are broken by plan id", () => {
    const r = matchPlans(syntheticCatalogue(), answers({ task: "receive", format: "both" }));
    // plan-a and plan-b have identical facts and price → alphabetical
    expect(ids(r.confirmed)).toEqual(["plan-a", "plan-b"]);
  });
});

describe("matchPlans — honest evidence states", () => {
  it("unknown hard requirement is never promoted to confirmed", () => {
    const r = matchPlans(syntheticCatalogue(), answers({ task: "receive", format: "both" }));
    expect(ids(r.unresolved)).toEqual(["plan-c"]); // cheaper, but zugferd receiving is unknown
    expect(ids(r.confirmed)).not.toContain("plan-c");
  });
  it("missing facts count as unknown, not supported", () => {
    const cat = syntheticCatalogue();
    cat.plan_features = cat.plan_features.filter((f) => f.plan_id !== "plan-a");
    const r = matchPlans(cat, answers({ task: "receive", format: "xrechnung" }));
    expect(ids(r.unresolved)).toContain("plan-a");
  });
  it("Quba (conditional XRechnung reading) is unresolved, not confirmed, for receiving both formats", () => {
    const r = matchPlans(realPublic(), answers({ task: "receive", format: "both" }));
    expect(ids(r.unresolved)).toContain("quba-desktop");
  });
});

describe("matchPlans — real catalogue scenarios (2026-11-11 data)", () => {
  it("receive both formats: Lexware S–XL and sevdesk Buchhaltung/Pro fit; sevdesk Rechnung/Kostenlos excluded", () => {
    const r = matchPlans(realPublic(), answers({ task: "receive", format: "both" }));
    expect(ids(r.confirmed).sort()).toEqual(
      ["lexware-office-l", "lexware-office-m", "lexware-office-s", "lexware-office-xl", "sevdesk-buchhaltung", "sevdesk-buchhaltung-pro"].sort(),
    );
    expect(ids(r.excluded)).toEqual(expect.arrayContaining(["sevdesk-kostenlos", "sevdesk-rechnung"]));
    // cheapest comparable plan first; conflicting sevdesk prices sort after verified ones
    expect(r.confirmed[0]?.planId).toBe("lexware-office-s");
  });
  it("sending XRechnung excludes Lexware S (no sending in S)", () => {
    const r = matchPlans(realPublic(), answers({ task: "send", format: "xrechnung", monthlyInvoices: 2 }));
    expect(ids(r.excluded)).toContain("lexware-office-s");
    expect(ids(r.confirmed)).toContain("lexware-office-m");
    expect(ids(r.confirmed)).toContain("sevdesk-kostenlos");
  });
  it("volume boundary: sevdesk Kostenlos allows 3/month, not 4", () => {
    const three = matchPlans(realPublic(), answers({ task: "send", format: "zugferd", monthlyInvoices: 3 }));
    const four = matchPlans(realPublic(), answers({ task: "send", format: "zugferd", monthlyInvoices: 4 }));
    expect(ids(three.confirmed)).toContain("sevdesk-kostenlos");
    expect(ids(four.excluded)).toContain("sevdesk-kostenlos");
    expect(four.excluded.find((r) => r.planId === "sevdesk-kostenlos")?.explanation.join(" ")).toMatch(/Grenze 3 pro Monat/);
  });
  it("volume boundary: Lexware fair-usage cap 50,000/year → 4,166/month ok, 4,167 not", () => {
    const ok = matchPlans(realPublic(), answers({ task: "send", format: "zugferd", monthlyInvoices: 4166 }));
    const tooMany = matchPlans(realPublic(), answers({ task: "send", format: "zugferd", monthlyInvoices: 4167 }));
    expect(ids(ok.confirmed)).toContain("lexware-office-m");
    expect(ids(tooMany.excluded)).toContain("lexware-office-m");
  });
  it("DATEV handover: Lexware is unresolved (DATEV export not documented), sevdesk paid plans confirmed", () => {
    const r = matchPlans(realPublic(), answers({ task: "send", format: "xrechnung", monthlyInvoices: 5, handover: "datev" }));
    expect(ids(r.unresolved)).toContain("lexware-office-m");
    expect(ids(r.confirmed)).toEqual(expect.arrayContaining(["sevdesk-rechnung", "sevdesk-buchhaltung"]));
    expect(ids(r.excluded)).toContain("sevdesk-kostenlos");
  });
  it("cost-first sort puts the cheapest comparable plan first", () => {
    const r = matchPlans(realPublic(), answers({ task: "send", format: "zugferd", monthlyInvoices: 2, sort: "cost" }));
    expect(r.confirmed[0]?.planId).toBe("sevdesk-kostenlos"); // 0 € and verified
    expect(r.orderDescription).toMatch(/Kosten/);
  });
});

describe("matchPlans — no-fit behaviour", () => {
  it("explains blocking needs instead of forcing a recommendation", () => {
    const cat = syntheticCatalogue();
    cat.plan_features = cat.plan_features.map((f) => ({ ...f, status: "unknown" as const, evidence_level: "none" as const }));
    const r = matchPlans(cat, answers({ task: "receive", format: "both" }));
    expect(r.confirmed).toHaveLength(0);
    expect(r.noFitExplanation).toMatch(/Kein Tarif/);
    expect(r.noFitExplanation).toMatch(/XRechnung empfangen/);
  });
  it("has no no-fit text when something fits", () => {
    expect(matchPlans(realPublic(), answers({ task: "receive", format: "both" })).noFitExplanation).toBeNull();
  });
});

describe("commercial neutrality", () => {
  it("approving an affiliate programme or changing commission does not change results", () => {
    const a = answers({ task: "both", format: "both", monthlyInvoices: 3 });
    const before = JSON.stringify(matchPlans(realPublic(), a));

    const cat = realCatalogue();
    cat.affiliate_programs = cat.affiliate_programs.map((p) => ({ ...p, status: "approved" as const, rate_description: "999 € pro Sale" }));
    cat.affiliate_links = cat.affiliate_links.map((l) => ({ ...l, status: "affiliate_active" as const, approved_tracking_url: "https://www.awin1.com/x", disclosure_label: "Werbung" }));
    const after = JSON.stringify(matchPlans(toPublicCatalogue(cat), a));
    expect(after).toBe(before);
  });
  it("the public catalogue contains no commercial fields", () => {
    const pub = realPublic() as Record<string, unknown>;
    expect(pub).not.toHaveProperty("affiliate_programs");
    expect(pub).not.toHaveProperty("affiliate_links");
  });
});
