/**
 * source-check.ts — pure helpers for scripts/check-sources.ts (kept here so they can be unit-tested).
 */
/** Today's date in Europe/Berlin as YYYY-MM-DD. */
export function berlinToday(now = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(now);
}

/** Turn HTML into comparable plain text and drop things that change on every request (countdowns). */
export function normaliseHtml(html: string): string {
  return html
    .replace(/<(script|style|noscript|svg|template)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&euro;/g, "€")
    .replace(/\b\d{1,2}:\d{2}:\d{2}(:\d{2})?\b/g, "<time>") // countdown timers
    .replace(/\b\d+d\s+\d+h\s+\d+m\s+\d+s\b/g, "<time>")
    .replace(/\s+/g, " ")
    .trim();
}

/** All euro amounts like "12,90 €" (sorted, unique) — price changes are the most important signal. */
export function extractPrices(text: string): string[] {
  const found = text.match(/\d{1,3}(?:\.\d{3})*(?:,\d{2})?\s?€/g) ?? [];
  return [...new Set(found.map((p) => p.replace(/\s/g, " ")))].sort();
}
