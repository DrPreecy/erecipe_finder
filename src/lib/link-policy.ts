/**
 * link-policy.ts — decides which outbound link a visitor gets for a vendor.
 * Runs AFTER ranking, so it can never change the order of results.
 *
 *  - Only HTTPS links to allow-listed vendor hosts (no open redirects).
 *  - An affiliate link is used only when its programme is approved; otherwise the ordinary link.
 *  - Affiliate links carry rel="sponsored" and a visible disclosure label.
 */
import type { AffiliateLink, AffiliateProgram } from "./catalogue-schema";

export const ALLOWED_HOSTS = new Set([
  "office.lexware.de",
  "sevdesk.de",
  "quba-viewer.org",
  "github.com",
  // Add tracking hosts (e.g. "www.awin1.com") only once a programme is actually approved.
]);

export interface OutboundLink {
  href: string;
  rel: string;
  isAffiliate: boolean;
  disclosureLabel: string | null;
}

export function isAllowedUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && ALLOWED_HOSTS.has(u.hostname);
  } catch {
    return false;
  }
}

export function outboundLinkFor(
  vendorId: string,
  links: AffiliateLink[],
  programs: AffiliateProgram[],
): OutboundLink | null {
  const candidates = links.filter((l) => l.vendor_id === vendorId);
  const affiliate = candidates.find((l) => {
    if (l.status !== "affiliate_active" || !l.approved_tracking_url) return false;
    const program = programs.find((p) => p.id === l.program_id);
    return program?.status === "approved" && isAllowedUrl(l.approved_tracking_url);
  });
  if (affiliate?.approved_tracking_url) {
    return {
      href: affiliate.approved_tracking_url,
      rel: "sponsored noopener noreferrer",
      isAffiliate: true,
      disclosureLabel: affiliate.disclosure_label ?? "Werbung / Affiliate-Link",
    };
  }
  const ordinary = candidates.find((l) => l.status === "ordinary" && isAllowedUrl(l.destination_url));
  return ordinary ? { href: ordinary.destination_url, rel: "noopener noreferrer", isAffiliate: false, disclosureLabel: null } : null;
}
