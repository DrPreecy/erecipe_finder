import { describe, expect, it } from "vitest";
import { checkIntegrity } from "../src/lib/integrity";
import { realCatalogue } from "./helpers";

describe("catalogue data (content safety)", () => {
  it("passes schema validation and integrity checks", () => {
    expect(checkIntegrity(realCatalogue())).toEqual([]);
  });
  it("has the three Day-1 vendors", () => {
    expect(realCatalogue().vendors.map((v) => v.id).sort()).toEqual(["lexware-office", "quba", "sevdesk"]);
  });
  it("every source was verified on 2026-11-11", () => {
    for (const s of realCatalogue().sources) expect(s.verified_at).toBe("2026-11-11");
  });
  it("nothing is labelled 'tested' yet (no test runs exist before Day 4)", () => {
    const c = realCatalogue();
    expect(c.test_runs).toHaveLength(0);
    expect(c.plan_features.filter((f) => f.evidence_level === "tested")).toHaveLength(0);
  });
  it("no affiliate link is active while no programme is approved", () => {
    const c = realCatalogue();
    expect(c.affiliate_programs.every((p) => p.status !== "approved")).toBe(true);
    expect(c.affiliate_links.every((l) => l.status === "ordinary")).toBe(true);
  });
});

describe("integrity checker catches bad data", () => {
  it("flags a supported fact without a source", () => {
    const c = realCatalogue();
    c.claim_sources = c.claim_sources.filter((s) => s.plan_feature_id !== "lexware-office-m--send-xrechnung");
    expect(checkIntegrity(c).join("\n")).toMatch(/lexware-office-m--send-xrechnung.*has no source/);
  });
  it("flags a 'tested' label without a test run", () => {
    const c = realCatalogue();
    c.plan_features[0] = { ...c.plan_features[0]!, evidence_level: "tested" };
    expect(checkIntegrity(c).join("\n")).toMatch(/labelled "tested" without a test run/);
  });
  it("flags an active affiliate link without an approved programme", () => {
    const c = realCatalogue();
    c.affiliate_links[0] = { ...c.affiliate_links[0]!, status: "affiliate_active", approved_tracking_url: "https://www.awin1.com/x", disclosure_label: "Werbung" };
    expect(checkIntegrity(c).join("\n")).toMatch(/without an approved programme/);
  });
  it("flags a duplicate active fact", () => {
    const c = realCatalogue();
    c.plan_features.push({ ...c.plan_features[0]!, id: "dup" });
    expect(checkIntegrity(c).join("\n")).toMatch(/second active fact/);
  });
});
