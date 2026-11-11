import { describe, expect, it } from "vitest";
import { berlinToday, extractPrices, normaliseHtml } from "../src/lib/source-check";

describe("source-check helpers", () => {
  it("strips scripts, styles, tags and countdown timers", () => {
    const html = `<html><script>var x=1</script><style>a{}</style><p>Preis <b>12,90&nbsp;€</b></p><span>06:05:32:56</span></html>`;
    expect(normaliseHtml(html)).toBe("Preis 12,90 € <time>");
  });
  it("two loads that differ only in a countdown normalise to the same text", () => {
    expect(normaliseHtml("<p>Deal 01:02:03</p>")).toBe(normaliseHtml("<p>Deal 23:59:59</p>"));
  });
  it("extracts euro amounts, unique and sorted", () => {
    expect(extractPrices("ab 7,90 € oder 12,90 € und 7,90 € – bis zu 200 € Provision")).toEqual(["12,90 €", "200 €", "7,90 €"]);
  });
  it("formats today's date in Europe/Berlin", () => {
    // 23:30 UTC on 11 Nov is already 12 Nov in Berlin (UTC+1)
    expect(berlinToday(new Date("2026-11-11T23:30:00Z"))).toBe("2026-11-12");
  });
});
