/**
 * Finder.tsx — the interactive React island.
 * Answers live only in component state (browser memory): nothing is stored or sent anywhere.
 */
import { useMemo, useState } from "react";
import type { PublicCatalogue } from "../lib/catalogue-schema";
import type { OutboundLink } from "../lib/link-policy";
import {
  DEFAULT_ANSWERS,
  STATUS_LABEL_DE,
  matchPlans,
  type Answers,
  type PlanResult,
} from "../lib/match";
import { formatEuro } from "../lib/pricing";

interface Props {
  catalogue: PublicCatalogue;
  /** vendorId → outbound link, decided at build time AFTER ranking logic (see link-policy.ts) */
  links: Record<string, OutboundLink | null>;
}

const PERIOD_DE: Record<string, string> = {
  monthly: "monatlich",
  annual: "jährlich (12 Monate)",
  biennial: "alle 24 Monate",
  one_time: "einmalig",
};

export default function Finder({ catalogue, links }: Props) {
  const [answers, setAnswers] = useState<Answers>(DEFAULT_ANSWERS);
  const result = useMemo(() => matchPlans(catalogue, answers), [catalogue, answers]);

  const set = <K extends keyof Answers>(key: K, value: Answers[K]) => setAnswers((a) => ({ ...a, [key]: value }));
  const setPref = <K extends keyof Answers["preferences"]>(key: K, value: Answers["preferences"][K]) =>
    setAnswers((a) => ({ ...a, preferences: { ...a.preferences, [key]: value } }));

  return (
    <div>
      <form onSubmit={(e) => e.preventDefault()} aria-label="Fragen zum Finder">
        <fieldset>
          <legend>1 — Was möchtest du tun?</legend>
          {(
            [
              ["receive", "E-Rechnungen empfangen / lesen"],
              ["send", "E-Rechnungen erstellen / senden"],
              ["both", "Beides"],
            ] as const
          ).map(([v, label]) => (
            <label key={v}>
              <input type="radio" name="task" checked={answers.task === v} onChange={() => set("task", v)} /> {label}
            </label>
          ))}
        </fieldset>

        <fieldset>
          <legend>2 — Welche Formate?</legend>
          {(
            [
              ["xrechnung", "XRechnung (reines XML)"],
              ["zugferd", "ZUGFeRD (PDF mit eingebettetem XML)"],
              ["both", "Beide"],
              ["unsure", "Weiß ich nicht"],
            ] as const
          ).map(([v, label]) => (
            <label key={v}>
              <input type="radio" name="format" checked={answers.format === v} onChange={() => set("format", v)} /> {label}
            </label>
          ))}
          {answers.format === "unsure" && (
            <p className="small">
              Beim Empfangen zählen wir beide Formate (du kannst nicht steuern, was ankommt). Beim Erstellen reicht eines
              der beiden. Das ist eine technische Annahme, keine rechtliche Einschätzung.
            </p>
          )}
        </fieldset>

        {answers.task !== "receive" && (
          <fieldset>
            <legend>3 — Wie viele Rechnungen schreibst du pro Monat?</legend>
            <label>
              Anzahl{" "}
              <input
                type="number"
                min={0}
                max={10000}
                value={answers.monthlyInvoices}
                onChange={(e) => set("monthlyInvoices", Math.max(0, Number(e.target.value) || 0))}
              />
            </label>
          </fieldset>
        )}

        <fieldset>
          <legend>4 — Was muss weitergegeben werden?</legend>
          {(
            [
              ["none", "Nichts Besonderes"],
              ["datev", "DATEV-Export für die Steuerberatung"],
              ["raw_xml", "Original-XML empfangener Rechnungen herunterladen"],
            ] as const
          ).map(([v, label]) => (
            <label key={v}>
              <input type="radio" name="handover" checked={answers.handover === v} onChange={() => set("handover", v)} />{" "}
              {label}
            </label>
          ))}
        </fieldset>

        <fieldset>
          <legend>5 — Wünsche (beeinflussen nur die Reihenfolge)</legend>
          <label>
            Programm:{" "}
            <select
              value={answers.preferences.runLocally}
              onChange={(e) => setPref("runLocally", e.target.value as Answers["preferences"]["runLocally"])}
            >
              <option value="any">egal</option>
              <option value="yes">lokal auf meinem Rechner</option>
              <option value="no">im Browser (Cloud)</option>
            </select>
          </label>
          <label>
            Buchhaltung:{" "}
            <select
              value={answers.preferences.wantsBookkeeping}
              onChange={(e) => setPref("wantsBookkeeping", e.target.value as Answers["preferences"]["wantsBookkeeping"])}
            >
              <option value="any">egal</option>
              <option value="no">nur Rechnungen</option>
              <option value="yes">mit Buchhaltung/EÜR</option>
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              checked={answers.preferences.monthlyCancellable}
              onChange={(e) => setPref("monthlyCancellable", e.target.checked)}
            />{" "}
            Monatlich kündbar
          </label>
          <label>
            Budget pro Monat (netto, €):{" "}
            <input
              type="number"
              min={0}
              step="0.5"
              placeholder="kein Limit"
              value={answers.preferences.maxMonthlyNetCents === null ? "" : answers.preferences.maxMonthlyNetCents / 100}
              onChange={(e) =>
                setPref("maxMonthlyNetCents", e.target.value === "" ? null : Math.round(Number(e.target.value) * 100))
              }
            />
          </label>
          <label>
            Sortierung:{" "}
            <select value={answers.sort} onChange={(e) => set("sort", e.target.value as Answers["sort"])}>
              <option value="fit">Passung zuerst</option>
              <option value="cost">Kosten zuerst</option>
            </select>
          </label>
        </fieldset>
      </form>

      <section aria-live="polite">
        <h2>Ergebnis</h2>
        <p className="small">{result.orderDescription}</p>
        {result.noFitExplanation && <p className="disclosure">{result.noFitExplanation}</p>}

        <h3>Passt laut Dokumentation ({result.confirmed.length})</h3>
        {result.confirmed.map((r) => (
          <ResultCard key={r.planId} r={r} catalogue={catalogue} link={links[r.vendorId] ?? null} />
        ))}

        <h3>Möglich, aber ungeklärt ({result.unresolved.length})</h3>
        {result.unresolved.length === 0 && <p className="small">Keine.</p>}
        {result.unresolved.map((r) => (
          <ResultCard key={r.planId} r={r} catalogue={catalogue} link={links[r.vendorId] ?? null} />
        ))}

        <details>
          <summary>Ausgeschlossen ({result.excluded.length})</summary>
          {result.excluded.map((r) => (
            <ResultCard key={r.planId} r={r} catalogue={catalogue} link={null} />
          ))}
        </details>
      </section>
    </div>
  );
}

function ResultCard({ r, catalogue, link }: { r: PlanResult; catalogue: PublicCatalogue; link: OutboundLink | null }) {
  const planFactIds = new Set(catalogue.plan_features.filter((f) => f.plan_id === r.planId).map((f) => f.id));
  const priceIds = new Set(catalogue.plan_prices.filter((p) => p.plan_id === r.planId).map((p) => p.id));
  const sourceIds = new Set(
    catalogue.claim_sources
      .filter((c) => (c.plan_feature_id && planFactIds.has(c.plan_feature_id)) || (c.plan_price_id && priceIds.has(c.plan_price_id)))
      .map((c) => c.source_id),
  );
  const sources = catalogue.sources.filter((s) => sourceIds.has(s.id));

  return (
    <article className={`result fit-${r.fit}`}>
      <h4>{r.planName}</h4>
      <ul>
        {r.requirements.map((q) => (
          <li key={q.requirement.id}>
            {q.requirement.label}:{" "}
            <strong className={`status-${q.status}`}>{STATUS_LABEL_DE[q.status]}</strong>
            {q.status !== "unknown" && <span className="small"> (laut Anbieterdokumentation, nicht selbst getestet)</span>}
            {q.notes.length > 0 && <span className="small"> — {q.notes.join(" ")}</span>}
          </li>
        ))}
      </ul>
      {r.cost && (
        <p>
          Kosten 1. Jahr: <strong>{formatEuro(r.cost.firstYearNetCents)} netto</strong>
          {r.cost.firstYearGrossCents !== null && <> ({formatEuro(r.cost.firstYearGrossCents)} inkl. 19 % USt.)</>} ·
          Abrechnung {PERIOD_DE[r.cost.billingPeriod]}
          {r.cost.monthlyNetCents !== null && <> · {formatEuro(r.cost.monthlyNetCents)}/Monat netto</>}
          {!r.cost.comparable && <span className="status-conditional"> · Preis nicht vergleichbar (siehe Hinweise)</span>}
        </p>
      )}
      {r.cost && r.cost.notes.length > 0 && (
        <ul className="small">
          {r.cost.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
      {r.explanation.length > 0 && <p className="small">{r.explanation.join(" ")}</p>}
      <p className="small">
        Quellen:{" "}
        {sources.map((s, i) => (
          <span key={s.id}>
            {i > 0 && " · "}
            <a href={s.url} rel="noopener noreferrer" target="_blank">
              {s.title}
            </a>{" "}
            (geprüft {s.verified_at})
          </span>
        ))}
      </p>
      {link && (
        <p>
          <a href={link.href} rel={link.rel} target="_blank">
            Zum Anbieter
          </a>
          {link.isAffiliate && <span className="small"> · {link.disclosureLabel}</span>}
        </p>
      )}
    </article>
  );
}
