-- 001_init.sql — Postgres BLUEPRINT for v2 (not used at launch).
-- v1 keeps the catalogue as validated JSON in src/data/catalogue/ (one file per table below).
-- Do not maintain JSON and SQL as two competing sources of truth: when Postgres becomes
-- authoritative (v2), it exports the same validated JSON snapshot for the static build.

CREATE TABLE sources (
  id             text PRIMARY KEY,
  url            text NOT NULL CHECK (url LIKE 'https://%'),
  title          text NOT NULL,
  publisher      text NOT NULL,
  kind           text NOT NULL,
  published_at   date,                      -- NULL when the page states no date (never "today")
  accessed_at    date NOT NULL,
  verified_at    date NOT NULL,
  fetch_method   text NOT NULL,
  short_note     text NOT NULL,
  artifact_path  text,
  artifact_sha256 text,
  CHECK (verified_at >= accessed_at)
);

CREATE TABLE vendors (
  id          text PRIMARY KEY,
  slug        text NOT NULL UNIQUE,
  name        text NOT NULL,
  website_url text NOT NULL,
  market      text NOT NULL DEFAULT 'DE',
  kind        text NOT NULL CHECK (kind IN ('saas','desktop_open_source')),
  active      boolean NOT NULL DEFAULT true
);

CREATE TABLE plans (
  id          text PRIMARY KEY,
  vendor_id   text NOT NULL REFERENCES vendors(id),
  slug        text NOT NULL,
  name        text NOT NULL,
  app_version text,
  status      text NOT NULL CHECK (status IN ('active','discontinued')),
  observed_at date NOT NULL,
  valid_from  date,
  valid_to    date,
  UNIQUE (vendor_id, slug),
  CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from)
);
CREATE INDEX plans_vendor_idx ON plans(vendor_id);

CREATE TABLE plan_prices (
  id                   text PRIMARY KEY,
  plan_id              text NOT NULL REFERENCES plans(id),
  currency             char(3) NOT NULL DEFAULT 'EUR',
  billing_period       text NOT NULL CHECK (billing_period IN ('one_time','monthly','annual','biennial')),
  amount_cents         integer CHECK (amount_cents >= 0),      -- NULL = unknown, never 0
  vat_basis            text NOT NULL CHECK (vat_basis IN ('net','gross','not_applicable')),
  minimum_term_months  integer CHECK (minimum_term_months > 0),
  mandatory_fees_cents integer CHECK (mandatory_fees_cents >= 0),
  promo                jsonb,
  renewal_amount_cents integer CHECK (renewal_amount_cents >= 0),
  confidence           text NOT NULL CHECK (confidence IN ('verified','conflicting')),
  conflict_note        text,
  source_id            text NOT NULL REFERENCES sources(id),
  verified_at          date NOT NULL,
  effective_from       date,
  effective_to         date,
  CHECK (confidence = 'verified' OR conflict_note IS NOT NULL),
  CHECK (effective_to IS NULL OR effective_from IS NULL OR effective_to >= effective_from)
);
CREATE INDEX plan_prices_plan_idx ON plan_prices(plan_id);

CREATE TABLE features (
  id             text PRIMARY KEY,
  key            text NOT NULL UNIQUE,
  label_de       text NOT NULL,
  description_de text NOT NULL,
  category       text NOT NULL,
  value_type     text NOT NULL CHECK (value_type IN ('boolean','quota')),
  unit           text
);

CREATE TABLE plan_features (
  id             text PRIMARY KEY,
  plan_id        text NOT NULL REFERENCES plans(id),
  feature_key    text NOT NULL REFERENCES features(key),
  status         text NOT NULL CHECK (status IN ('supported','unsupported','conditional','unknown')),
  value          jsonb,                         -- e.g. {"max": 3, "per": "month"}; max NULL = unlimited
  conditions     text,
  evidence_level text NOT NULL CHECK (evidence_level IN ('documented','tested','none')),
  reviewed_at    date NOT NULL,
  valid_from     date,
  valid_to       date,
  CHECK (status <> 'unknown' OR evidence_level = 'none')
);
-- Only one CURRENT fact per plan + feature; history rows have valid_to set.
CREATE UNIQUE INDEX plan_features_current_uq ON plan_features(plan_id, feature_key) WHERE valid_to IS NULL;

CREATE TABLE claim_sources (
  id              text PRIMARY KEY,
  source_id       text NOT NULL REFERENCES sources(id),
  plan_feature_id text REFERENCES plan_features(id),
  plan_price_id   text REFERENCES plan_prices(id),
  supporting_note text NOT NULL,
  CHECK ((plan_feature_id IS NULL) <> (plan_price_id IS NULL))   -- exactly one claim target
);

CREATE TABLE fixtures (
  id                    text PRIMARY KEY,
  slug                  text NOT NULL UNIQUE,
  format                text NOT NULL,
  profile               text NOT NULL,
  specification_version text NOT NULL,
  file_path             text NOT NULL,     -- files live in the repo (fixtures/), not as DB blobs
  sha256                char(64) NOT NULL,
  expected_outcome      text NOT NULL CHECK (expected_outcome IN ('valid','invalid')),
  synthetic             boolean NOT NULL DEFAULT true CHECK (synthetic),
  licence               text NOT NULL,
  created_at            date NOT NULL
);

CREATE TABLE test_runs (                    -- append-only evidence: never update or delete a run
  id                text PRIMARY KEY,
  plan_id           text NOT NULL REFERENCES plans(id),
  fixture_id        text NOT NULL REFERENCES fixtures(id),
  workflow          text NOT NULL CHECK (workflow IN ('import','export','validate')),
  app_version       text,
  run_at            timestamptz NOT NULL,
  validator_version text,
  ruleset_version   text,
  result            text NOT NULL CHECK (result IN ('pass','fail','blocked')),
  observations      text NOT NULL,
  artifact_path     text,
  artifact_sha256   text,
  tester            text NOT NULL
);

CREATE TABLE claim_test_runs (
  plan_feature_id text NOT NULL REFERENCES plan_features(id),
  test_run_id     text NOT NULL REFERENCES test_runs(id),
  scope_note      text NOT NULL,
  PRIMARY KEY (plan_feature_id, test_run_id)
);

-- Commercial metadata: NEVER an input to matching.
CREATE TABLE affiliate_programs (
  id               text PRIMARY KEY,
  vendor_id        text NOT NULL REFERENCES vendors(id),
  network          text NOT NULL,
  status           text NOT NULL CHECK (status IN ('not_applied','pending','approved','rejected')),
  rate_description text NOT NULL,
  terms_source_id  text NOT NULL REFERENCES sources(id),
  verified_at      date NOT NULL
);

CREATE TABLE affiliate_links (
  id                   text PRIMARY KEY,
  vendor_id            text NOT NULL REFERENCES vendors(id),
  program_id           text REFERENCES affiliate_programs(id),
  plan_id              text REFERENCES plans(id),
  destination_url      text NOT NULL CHECK (destination_url LIKE 'https://%'),
  approved_tracking_url text CHECK (approved_tracking_url LIKE 'https://%'),
  disclosure_label     text,
  status               text NOT NULL CHECK (status IN ('ordinary','affiliate_active')),
  checked_at           date NOT NULL,
  CHECK (status = 'ordinary' OR (approved_tracking_url IS NOT NULL AND disclosure_label IS NOT NULL))
);
