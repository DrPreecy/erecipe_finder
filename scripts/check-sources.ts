/**
 * npm run check-sources            → re-fetch every source + outbound link, compare with the last snapshot
 * npm run check-sources -- --accept → same, then save the current state as the new baseline
 *
 * What it reports (also written to reports/source-check-YYYY-MM-DD.md):
 *   BROKEN   HTTP error / timeout          → fix or replace the URL
 *   CHANGED  page text changed             → re-read the page; update the catalogue if a fact changed
 *            (euro amounts added/removed are listed — the highest-signal change)
 *   NEW      no snapshot yet               → baseline will be created with --accept
 *   OK       unchanged
 *   STALE    verified_at older than the review window (7 days for prices/affiliate terms, 30 for the rest)
 *
 * This script never edits the catalogue. A changed page means "a human must re-verify",
 * and an unchanged page does NOT make a fact freshly verified (plan §6).
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { loadCatalogue } from "../src/lib/catalogue";
import { berlinToday, extractPrices, normaliseHtml } from "../src/lib/source-check";

const SNAPSHOT_FILE = "data/source-snapshots.json";
const REPORT_DIR = "reports";
const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36 erechnung-finder-source-check";
const TIMEOUT_MS = 45_000;

interface Snapshot {
  url: string;
  status: number | null;
  textHash: string | null;
  prices: string[];
  textLength: number;
  checkedAt: string;
}
type SnapshotStore = Record<string, Snapshot>;

async function fetchOnce(url: string): Promise<{ status: number | null; body: string; error?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "user-agent": USER_AGENT, "accept-language": "de-DE,de;q=0.9" },
      redirect: "follow",
      signal: controller.signal,
    });
    return { status: res.status, body: await res.text() };
  } catch (err) {
    return { status: null, body: "", error: err instanceof Error ? err.message : String(err) };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const accept = process.argv.includes("--accept");
  const today = berlinToday();
  const catalogue = loadCatalogue();
  const previous: SnapshotStore = existsSync(SNAPSHOT_FILE) ? JSON.parse(readFileSync(SNAPSHOT_FILE, "utf8")) : {};

  const targets = [
    ...catalogue.sources.map((s) => ({ url: s.url, label: s.id, verifiedAt: s.verified_at, kind: s.kind as string })),
    ...catalogue.affiliate_links.map((l) => ({ url: l.destination_url, label: l.id, verifiedAt: l.checked_at, kind: "outbound_link" })),
  ];
  // De-duplicate URLs (an outbound link can equal a source URL).
  const unique = targets.filter((t, i) => targets.findIndex((x) => x.url === t.url) === i);

  const next: SnapshotStore = { ...previous };
  const lines: string[] = [];
  const counts = { OK: 0, CHANGED: 0, NEW: 0, BROKEN: 0 };

  for (const t of unique) {
    let r = await fetchOnce(t.url);
    if (r.status === null || r.status >= 500) r = await fetchOnce(t.url); // one retry
    const old = previous[t.url];

    if (r.status === null || r.status >= 400) {
      counts.BROKEN++;
      lines.push(`- **BROKEN** \`${t.label}\` ${t.url} — ${r.error ?? `HTTP ${r.status}`}`);
      continue; // keep the old snapshot
    }
    const text = normaliseHtml(r.body);
    const snap: Snapshot = {
      url: t.url,
      status: r.status,
      textHash: createHash("sha256").update(text).digest("hex"),
      prices: extractPrices(text),
      textLength: text.length,
      checkedAt: today,
    };
    if (!old) {
      counts.NEW++;
      lines.push(`- **NEW** \`${t.label}\` ${t.url} (${snap.prices.length} euro amounts found)`);
    } else if (old.textHash !== snap.textHash) {
      counts.CHANGED++;
      const added = snap.prices.filter((p) => !old.prices.includes(p));
      const removed = old.prices.filter((p) => !snap.prices.includes(p));
      const priceInfo =
        added.length || removed.length
          ? ` — **prices changed** added: [${added.join(", ")}] removed: [${removed.join(", ")}]`
          : " — text changed, euro amounts unchanged";
      lines.push(`- **CHANGED** \`${t.label}\` ${t.url} (length ${old.textLength} → ${snap.textLength})${priceInfo}`);
    } else {
      counts.OK++;
      lines.push(`- OK \`${t.label}\` ${t.url}`);
    }
    next[t.url] = snap;
  }

  // Review-window check on the catalogue itself
  const stale: string[] = [];
  const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
  for (const s of catalogue.sources) {
    const window = s.kind === "vendor_pricing" || s.kind === "vendor_affiliate" || s.kind === "affiliate_network" ? 7 : 30;
    const age = daysBetween(s.verified_at, today);
    if (age > window) stale.push(`- **STALE** \`${s.id}\` verified ${s.verified_at} (${age} days ago, window ${window} days)`);
  }

  const report = [
    `# Source check ${today} (Europe/Berlin)`,
    "",
    `OK ${counts.OK} · CHANGED ${counts.CHANGED} · NEW ${counts.NEW} · BROKEN ${counts.BROKEN} · STALE ${stale.length}`,
    "",
    "## Pages",
    ...lines,
    "",
    "## Review window",
    ...(stale.length ? stale : ["- all sources are within their review window"]),
    "",
    "_A CHANGED page must be re-read by a human; update the catalogue JSON + verified_at, then run with `--accept`._",
    "",
  ].join("\n");

  mkdirSync(REPORT_DIR, { recursive: true });
  const reportPath = `${REPORT_DIR}/source-check-${today}.md`;
  writeFileSync(reportPath, report);
  console.log(report);
  console.log(`Report written to ${reportPath}`);

  if (accept) {
    mkdirSync("data", { recursive: true });
    writeFileSync(SNAPSHOT_FILE, JSON.stringify(next, null, 2) + "\n");
    console.log(`Baseline updated in ${SNAPSHOT_FILE}`);
  } else if (counts.NEW > 0) {
    console.log("Tip: run `npm run check-sources -- --accept` to store a baseline for NEW pages.");
  }
  process.exitCode = counts.BROKEN > 0 ? 1 : 0;
}

void main();
