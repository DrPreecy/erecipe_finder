# Product brief (Day 1 — "freeze the wedge and the data contract")

Source of truth for scope: the product plan Page ("E‑Rechnung Finder — Product & Launch Plan").
This file records the Day‑1 decisions in the repo so they are versioned with the code.

## Working name

**E‑Rechnung Finder** (working name only). Before buying a domain: check DPMA/EUIPO trademark search and obvious
name conflicts. A host subdomain (e.g. `*.pages.dev`) is enough for the preview — no domain purchase needed yet.

## First audience

German **solo freelance developers and designers** who
- write a handful of domestic B2B invoices per month, today with Word/PDF or a simple invoicing tool,
- need to **receive** structured invoices and/or **send** XRechnung/ZUGFeRD when their workflow requires it,
- may use §19 UStG — the finder does **not** determine anyone's tax status.

The job: *choose the smallest sufficient plan* without paying for a full accounting stack, missing a format
limitation, or discovering that an export needs a higher tier.

German value proposition (landing copy):
> „Die passende E‑Rechnungssoftware für deinen Ablauf — mit Tarifgrenzen, Jahreskosten und nachvollziehbaren Quellen.“

(“Testbelegen” only once Day‑4 test runs actually exist.)

## Excluded workflows (out of scope for v1)

- Creating, sending, storing or legally validating customers’ real invoices; no invoice upload.
- Personalised legal/tax rulings (“Bist du verpflichtet…?”), compliance certificates, GoBD promises.
- Enterprise procurement, ERP migration, every public-sector portal (B2G only where explicitly checked).
- Directory scraping, lead resale, calls, cold e‑mails, agency marketplace.
- LLM recommendations, chat, accounts, subscriptions, payments, analytics scripts.

## Matching policy (implemented in `src/lib/match.ts`)

1. Answers → **hard requirements** (formats per direction, volume, handover) + **soft preferences**
   (local vs. cloud, monthly cancellable, bookkeeping wanted or not, budget).
2. Unsupported hard requirement → plan **excluded**. Unknown/conditional → **unresolved**, never a confirmed fit.
   Missing data counts as unknown.
3. Order within a group: preferences met ↓ → comparable first‑year net cost ↑ → plan id. Visitors can switch to cost‑first.
4. “Not sure” about formats: receiving needs *both* (you can’t choose what arrives); sending needs *either*.
   This is a technical assumption, explained in the UI, not a legal inference.
5. Commercial data (affiliate programmes/links) is stripped before matching (`toPublicCatalogue`) and attached after
   ranking (`link-policy.ts`). A test proves that approving programmes/changing commission changes nothing.
6. No confirmed fit → explain which requirements block, list unresolved candidates, suggest relaxing a criterion.

## Cost policy (implemented in `src/lib/pricing.ts`)

Integer cents; first year = 12 × monthly (equivalent) + mandatory fees. Promotions only when eligibility is known
(currently never). Unknown fees → total incomplete. Prices whose source contradicts itself are shown but can never
win a cheapest claim. Net and gross (19 % display only) are shown separately.

## Business prerequisites (start now, before monetisation)

- [ ] Read the training contract; inform the Ausbildungsbetrieb about the side project; get permission if required.
- [ ] Gewerbeanmeldung (§14 GewO) and tax registration (§138 AO) before affiliate income — ask the local
      Gewerbeamt/Finanzamt or an adviser; Kleingewerbe ≠ Kleinunternehmer (§19 UStG).
- [ ] Impressum (§5 DDG) and Datenschutzerklärung with real details before any public, monetised release.
