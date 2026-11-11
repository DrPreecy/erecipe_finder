import { describe, expect, it } from "vitest";
import { isAllowedUrl, outboundLinkFor } from "../src/lib/link-policy";
import { realCatalogue } from "./helpers";

describe("link policy", () => {
  it("uses the ordinary vendor link while programmes are not approved", () => {
    const c = realCatalogue();
    const link = outboundLinkFor("sevdesk", c.affiliate_links, c.affiliate_programs);
    expect(link).toEqual({ href: "https://sevdesk.de/preise/", rel: "noopener noreferrer", isAffiliate: false, disclosureLabel: null });
  });
  it("rejects non-https and non-allow-listed URLs", () => {
    expect(isAllowedUrl("http://sevdesk.de/")).toBe(false);
    expect(isAllowedUrl("https://evil.example/")).toBe(false);
    expect(isAllowedUrl("not a url")).toBe(false);
  });
  it("never uses a tracking link from an unapproved programme", () => {
    const c = realCatalogue();
    const links = c.affiliate_links.map((l) => ({ ...l, status: "affiliate_active" as const, approved_tracking_url: "https://sevdesk.de/?ref=x" }));
    expect(outboundLinkFor("sevdesk", links, c.affiliate_programs)?.isAffiliate ?? false).toBe(false);
  });
  it("labels an approved affiliate link as sponsored", () => {
    const c = realCatalogue();
    const programs = c.affiliate_programs.map((p) => ({ ...p, status: "approved" as const }));
    const links = c.affiliate_links.map((l) =>
      l.vendor_id === "sevdesk" ? { ...l, program_id: "aff-sevdesk-awin", status: "affiliate_active" as const, approved_tracking_url: "https://sevdesk.de/?ref=x", disclosure_label: "Werbung / Affiliate-Link" } : l,
    );
    const link = outboundLinkFor("sevdesk", links, programs);
    expect(link?.isAffiliate).toBe(true);
    expect(link?.rel).toContain("sponsored");
  });
});
