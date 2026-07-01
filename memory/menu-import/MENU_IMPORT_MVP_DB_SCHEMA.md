# MyGenie POS — Production-Grade AI Menu Import System — Database Schema (PostgreSQL)

**Document version:** 2.0 (production-grade revision)
**Status:** Draft — pending Approval Gate 3
**DBMS:** PostgreSQL 14+
**Schema namespace:** `menu_import`
**Positioning:** Schema is live-production safe from Phase 1. Tables support idempotency, row-level traceability, audit, rollback, and tenant isolation by design.

> **Note on conventions**
> - All primary keys are `BIGSERIAL` (or `UUID v7` if the POS uses UUIDs — to be confirmed; this doc shows BIGSERIAL with parallel UUID suggestions).
> - All timestamps are `TIMESTAMPTZ` defaulting to `NOW()`.
> - All tables include `created_at`, `updated_at`. Long-lived tables include `deleted_at` (soft delete).
> - `restaurant_id BIGINT NOT NULL` on every tenant-scoped table — never nullable.
> - All status / type fields are PostgreSQL ENUMs for safety + index efficiency.
> - JSONB used for flexible/unbounded payloads (`warnings`, `confidence`, `rollback_ref`, `applied_memory_ids`).
> - Idempotency keys + correction events are append-only (no UPDATE).

---

## 1. Schema + Extensions

```sql
CREATE SCHEMA IF NOT EXISTS menu_import;
SET search_path = menu_import, public;

CREATE EXTENSION IF NOT EXISTS pgcrypto;     -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pg_trgm;      -- trigram for fuzzy search
CREATE EXTENSION IF NOT EXISTS btree_gin;    -- GIN on btree types
```

---

## 2. ENUM Types

```sql
CREATE TYPE import_status AS ENUM (
  'uploaded',
  'preprocessing',
  'extracting',
  'review_required',
  'syncing',
  'sync_partial',
  'synced_to_menu',
  'failed'
);

CREATE TYPE page_status AS ENUM (
  'pending', 'preprocessing', 'ready', 'extracting', 'extracted', 'failed'
);

CREATE TYPE row_status AS ENUM (
  'raw',
  'review_required',
  'approved',
  'rejected',
  'merged',
  'converted_to_variant',
  'converted_to_addon',
  'marked_as_menu_note',
  'marked_as_combo',
  'syncing',
  'synced',
  'sync_failed'
);

CREATE TYPE child_status AS ENUM (
  'raw', 'review_required', 'approved', 'rejected', 'ignored'
);

CREATE TYPE food_type AS ENUM (
  'veg', 'non_veg', 'egg', 'unknown'
);

CREATE TYPE pricing_type AS ENUM (
  'fixed', 'variant_based', 'addon_based',
  'weight_based', 'quantity_based', 'open_price'
);

CREATE TYPE modifier_group_type AS ENUM (
  'variant_group', 'addon_group', 'choice_group',
  'combo_group', 'preparation_preference'
);

CREATE TYPE menu_note_type AS ENUM (
  'tax_note', 'service_charge_note', 'packaging_note',
  'addon_note', 'availability_note', 'general_note'
);

CREATE TYPE menu_note_mapped_to AS ENUM (
  'unmapped', 'addon', 'modifier', 'tax_setting', 'item_description', 'ignored'
);

CREATE TYPE correction_type AS ENUM (
  'spelling_fix', 'price_fix', 'category_fix', 'subcategory_fix',
  'variant_fix', 'addon_fix', 'modifier_fix', 'food_type_fix',
  'unit_fix', 'combo_fix', 'tax_note_fix',
  'manual_addition', 'manual_deletion'
);

CREATE TYPE correction_source AS ENUM ('user', 'system', 'admin');

CREATE TYPE memory_scope AS ENUM ('restaurant', 'cuisine', 'global');

CREATE TYPE memory_pattern_type AS ENUM (
  'spelling', 'category_mapping', 'subcategory_mapping',
  'price_pattern', 'variant_pattern', 'addon_pattern',
  'modifier_pattern', 'food_type', 'unit_pricing',
  'combo_pattern', 'tax_note'
);

CREATE TYPE audit_action AS ENUM (
  'sync_create_category', 'sync_create_item',
  'sync_add_variants', 'sync_add_addons',
  'sync_failed', 'rollback_delete_item'
);
```

---

## 3. Tables

### 3.1 `menu_imports`

```sql
CREATE TABLE menu_imports (
  id                       BIGSERIAL PRIMARY KEY,
  restaurant_id            BIGINT       NOT NULL,
  uploaded_by              BIGINT       NOT NULL,                 -- user_id from POS JWT
  cuisine_type             TEXT,                                  -- snapshot at upload time

  file_url                 TEXT         NOT NULL,                 -- storage key (relative)
  file_name                TEXT         NOT NULL,
  file_type                TEXT         NOT NULL,                 -- mime
  file_size_bytes          BIGINT       NOT NULL,
  file_hash                CHAR(64)     NOT NULL,                 -- sha256 hex

  status                   import_status NOT NULL DEFAULT 'uploaded',
  failure_reason           TEXT,

  -- versioning
  model_used               TEXT         NOT NULL,                 -- e.g. 'gemini-3-pro'
  model_version            TEXT,                                  -- model API metadata
  prompt_version           TEXT         NOT NULL,
  normalizer_version       TEXT         NOT NULL,
  preprocessing_version    TEXT         NOT NULL,

  -- aggregates
  total_pages              INTEGER      NOT NULL DEFAULT 0,
  total_rows_extracted     INTEGER      NOT NULL DEFAULT 0,
  total_rows_approved      INTEGER      NOT NULL DEFAULT 0,
  total_rows_rejected      INTEGER      NOT NULL DEFAULT 0,
  total_rows_synced        INTEGER      NOT NULL DEFAULT 0,
  total_rows_sync_failed   INTEGER      NOT NULL DEFAULT 0,

  -- AI cost accounting
  tokens_input             BIGINT       NOT NULL DEFAULT 0,
  tokens_output            BIGINT       NOT NULL DEFAULT 0,
  cost_usd                 NUMERIC(12,6) NOT NULL DEFAULT 0,

  -- rollback
  rollback_ref             JSONB        NOT NULL DEFAULT '[]'::jsonb,

  created_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at               TIMESTAMPTZ
);

CREATE INDEX idx_imports_restaurant_status ON menu_imports (restaurant_id, status, created_at DESC);
CREATE INDEX idx_imports_file_hash         ON menu_imports (restaurant_id, file_hash);
CREATE INDEX idx_imports_status            ON menu_imports (status) WHERE deleted_at IS NULL;
CREATE INDEX idx_imports_created           ON menu_imports (created_at DESC);
```

### 3.2 `menu_import_pages`

```sql
CREATE TABLE menu_import_pages (
  id                  BIGSERIAL PRIMARY KEY,
  menu_import_id      BIGINT      NOT NULL REFERENCES menu_imports(id) ON DELETE CASCADE,
  page_no             INTEGER     NOT NULL,
  image_url           TEXT,                                          -- storage key for processed page
  ocr_text            TEXT,                                          -- optional OCR snapshot (for debug)
  processing_status   page_status NOT NULL DEFAULT 'pending',
  error_message       TEXT,
  width_px            INTEGER,
  height_px           INTEGER,
  rotation_deg        INTEGER,

  -- raw model response (kept for audit + reprocess)
  raw_extraction_payload JSONB,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (menu_import_id, page_no)
);

CREATE INDEX idx_pages_import_status ON menu_import_pages (menu_import_id, processing_status);
```

### 3.3 `menu_import_rows`

```sql
CREATE TABLE menu_import_rows (
  id                       BIGSERIAL PRIMARY KEY,
  menu_import_id           BIGINT      NOT NULL REFERENCES menu_imports(id) ON DELETE CASCADE,
  page_id                  BIGINT      REFERENCES menu_import_pages(id) ON DELETE SET NULL,
  restaurant_id            BIGINT      NOT NULL,                     -- denormalized for tenant filtering

  -- raw extraction
  raw_text                 TEXT,
  source_bbox              JSONB,                                    -- { x, y, w, h } on the page image (provenance)
  source                   TEXT        NOT NULL DEFAULT 'ai',        -- 'ai' | 'manual'
  item_name                TEXT,
  category                 TEXT,
  subcategory              TEXT,
  rate                     NUMERIC(12,2),
  food_type                food_type   NOT NULL DEFAULT 'unknown',
  pricing_type             pricing_type NOT NULL DEFAULT 'fixed',
  unit                     TEXT,
  description              TEXT,

  -- corrected (NULL until user corrects)
  corrected_item_name      TEXT,
  corrected_category       TEXT,
  corrected_subcategory    TEXT,
  corrected_rate           NUMERIC(12,2),
  corrected_food_type      food_type,
  corrected_pricing_type   pricing_type,
  corrected_unit           TEXT,
  corrected_description    TEXT,

  confidence_score         NUMERIC(4,3) NOT NULL DEFAULT 0,           -- 0.000–1.000
  confidence_breakdown     JSONB        NOT NULL DEFAULT '{}'::jsonb, -- per-field scores
  warnings_json            JSONB        NOT NULL DEFAULT '[]'::jsonb, -- array of warning codes

  status                   row_status   NOT NULL DEFAULT 'raw',
  reviewed                 BOOLEAN      NOT NULL DEFAULT FALSE,       -- user explicitly marked row reviewed
  display_order            INTEGER      NOT NULL DEFAULT 0,

  -- approval bookkeeping
  approved_by              BIGINT,
  approved_at              TIMESTAMPTZ,
  force_approved           BOOLEAN     NOT NULL DEFAULT FALSE,        -- approve with blocking warning override (admin-only)
  rejected_reason          TEXT,
  merged_into_row_id       BIGINT REFERENCES menu_import_rows(id) ON DELETE SET NULL,
  parent_row_id            BIGINT REFERENCES menu_import_rows(id) ON DELETE SET NULL,
                                                                    -- when this row was converted to variant/addon of another

  -- duplicate prevention
  dedup_resolution         TEXT,                                     -- 'create_new' | 'update_existing' | 'skip'
  dedup_target_external_id TEXT,                                     -- POS item id when resolution = update_existing

  -- sync bookkeeping
  synced_external_ref      JSONB,                                    -- {item_id, variant_ids[], addon_ids[]}
  last_sync_attempt_at     TIMESTAMPTZ,
  sync_attempts            INTEGER     NOT NULL DEFAULT 0,
  sync_error               TEXT,

  -- traceability
  applied_memory_ids       JSONB        NOT NULL DEFAULT '[]'::jsonb,

  -- optimistic concurrency
  version                  INTEGER     NOT NULL DEFAULT 1,

  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rows_import_status     ON menu_import_rows (menu_import_id, status);
CREATE INDEX idx_rows_restaurant_status ON menu_import_rows (restaurant_id, status);
CREATE INDEX idx_rows_page              ON menu_import_rows (page_id);
CREATE INDEX idx_rows_parent            ON menu_import_rows (parent_row_id);
CREATE INDEX idx_rows_warnings_gin      ON menu_import_rows USING GIN (warnings_json);
CREATE INDEX idx_rows_item_name_trgm    ON menu_import_rows USING GIN (item_name gin_trgm_ops);
CREATE INDEX idx_rows_reviewed          ON menu_import_rows (menu_import_id, reviewed, status);
```

### 3.4 `menu_import_row_variants`

```sql
CREATE TABLE menu_import_row_variants (
  id                          BIGSERIAL PRIMARY KEY,
  menu_import_row_id          BIGINT      NOT NULL REFERENCES menu_import_rows(id) ON DELETE CASCADE,

  variant_group_name          TEXT,                       -- e.g., "Size"
  variant_name                TEXT        NOT NULL,
  variant_price               NUMERIC(12,2),

  corrected_variant_group_name TEXT,
  corrected_variant_name      TEXT,
  corrected_variant_price     NUMERIC(12,2),

  is_default                  BOOLEAN     NOT NULL DEFAULT FALSE,
  display_order               INTEGER     NOT NULL DEFAULT 0,

  confidence_score            NUMERIC(4,3) NOT NULL DEFAULT 0,
  status                      child_status NOT NULL DEFAULT 'raw',

  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_variants_row ON menu_import_row_variants (menu_import_row_id, status);
CREATE UNIQUE INDEX uq_variants_row_name
  ON menu_import_row_variants (menu_import_row_id, COALESCE(corrected_variant_name, variant_name));
```

### 3.5 `menu_import_row_addons`

```sql
CREATE TABLE menu_import_row_addons (
  id                       BIGSERIAL PRIMARY KEY,
  menu_import_row_id       BIGINT      NOT NULL REFERENCES menu_import_rows(id) ON DELETE CASCADE,

  addon_group_name         TEXT,                          -- e.g., "Extras"
  addon_name               TEXT        NOT NULL,
  addon_price              NUMERIC(12,2),

  corrected_addon_group_name TEXT,
  corrected_addon_name     TEXT,
  corrected_addon_price    NUMERIC(12,2),

  display_order            INTEGER     NOT NULL DEFAULT 0,

  confidence_score         NUMERIC(4,3) NOT NULL DEFAULT 0,
  status                   child_status NOT NULL DEFAULT 'raw',

  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_addons_row ON menu_import_row_addons (menu_import_row_id, status);
```

### 3.6 `menu_import_modifier_groups`

```sql
CREATE TABLE menu_import_modifier_groups (
  id                BIGSERIAL PRIMARY KEY,
  menu_import_id    BIGINT       NOT NULL REFERENCES menu_imports(id) ON DELETE CASCADE,
  page_id           BIGINT       REFERENCES menu_import_pages(id) ON DELETE SET NULL,
  source_row_id     BIGINT       REFERENCES menu_import_rows(id) ON DELETE SET NULL,

  group_name        TEXT         NOT NULL,
  group_type        modifier_group_type NOT NULL DEFAULT 'choice_group',
  min_select        INTEGER      NOT NULL DEFAULT 0,
  max_select        INTEGER      NOT NULL DEFAULT 1,
  is_required       BOOLEAN      NOT NULL DEFAULT FALSE,

  confidence_score  NUMERIC(4,3) NOT NULL DEFAULT 0,
  status            child_status NOT NULL DEFAULT 'raw',

  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_modgroups_import ON menu_import_modifier_groups (menu_import_id, status);
```

### 3.7 `menu_import_modifier_options`

```sql
CREATE TABLE menu_import_modifier_options (
  id                       BIGSERIAL PRIMARY KEY,
  modifier_group_id        BIGINT      NOT NULL REFERENCES menu_import_modifier_groups(id) ON DELETE CASCADE,
  option_name              TEXT        NOT NULL,
  option_price             NUMERIC(12,2),
  corrected_option_name    TEXT,
  corrected_option_price   NUMERIC(12,2),
  display_order            INTEGER     NOT NULL DEFAULT 0,
  status                   child_status NOT NULL DEFAULT 'raw',
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_modopts_group ON menu_import_modifier_options (modifier_group_id, status);
```

### 3.8 `menu_import_menu_notes`

```sql
CREATE TABLE menu_import_menu_notes (
  id                BIGSERIAL PRIMARY KEY,
  menu_import_id    BIGINT       NOT NULL REFERENCES menu_imports(id) ON DELETE CASCADE,
  page_id           BIGINT       REFERENCES menu_import_pages(id) ON DELETE SET NULL,

  note_text         TEXT         NOT NULL,
  note_type         menu_note_type NOT NULL DEFAULT 'general_note',
  mapped_to         menu_note_mapped_to NOT NULL DEFAULT 'unmapped',

  confidence_score  NUMERIC(4,3) NOT NULL DEFAULT 0,
  status            child_status NOT NULL DEFAULT 'raw',

  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_menu_notes_import ON menu_import_menu_notes (menu_import_id, status);
```

### 3.9 `menu_import_corrections` (append-only)

```sql
CREATE TABLE menu_import_corrections (
  id                  BIGSERIAL PRIMARY KEY,
  restaurant_id       BIGINT             NOT NULL,
  menu_import_id      BIGINT             NOT NULL REFERENCES menu_imports(id) ON DELETE CASCADE,
  menu_import_row_id  BIGINT             REFERENCES menu_import_rows(id) ON DELETE SET NULL,
  child_table         TEXT,               -- 'variant' | 'addon' | 'modifier_group' | 'modifier_option' | 'menu_note' | NULL
  child_id            BIGINT,             -- id within that child table

  field_name          TEXT               NOT NULL,
  old_value           TEXT,
  new_value           TEXT,
  raw_text            TEXT,               -- the raw OCR text that produced the wrong value

  correction_type     correction_type    NOT NULL,
  source              correction_source  NOT NULL DEFAULT 'user',
  created_by          BIGINT,             -- user_id or NULL for system

  -- traceability
  model_used          TEXT,
  model_version       TEXT,
  prompt_version      TEXT,
  normalizer_version  TEXT,
  preprocessing_version TEXT,

  created_at          TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_corrections_restaurant ON menu_import_corrections (restaurant_id, created_at DESC);
CREATE INDEX idx_corrections_row        ON menu_import_corrections (menu_import_row_id);
CREATE INDEX idx_corrections_field      ON menu_import_corrections (restaurant_id, field_name);
CREATE INDEX idx_corrections_type       ON menu_import_corrections (correction_type);
```

> **Append-only enforcement**: a row trigger refuses `UPDATE` and `DELETE` on this table for non-admin roles.

### 3.10 `menu_learning_memory`

```sql
CREATE TABLE menu_learning_memory (
  id              BIGSERIAL PRIMARY KEY,
  scope           memory_scope         NOT NULL,
  restaurant_id   BIGINT,                                  -- NULL when scope != 'restaurant'
  cuisine_type    TEXT,                                    -- NULL when scope = 'global' or 'restaurant'
  pattern_type    memory_pattern_type  NOT NULL,

  wrong_value     TEXT,                                    -- e.g. 'Panner'
  correct_value   TEXT,                                    -- e.g. 'Paneer'
  context         JSONB NOT NULL DEFAULT '{}'::jsonb,      -- e.g. { "category": "Indian Main" }

  confidence      NUMERIC(4,3)         NOT NULL DEFAULT 0, -- promotion confidence
  usage_count     INTEGER              NOT NULL DEFAULT 0,
  distinct_restaurants INTEGER         NOT NULL DEFAULT 0, -- for promotion gating
  last_used_at    TIMESTAMPTZ,

  -- promotion control
  approved_by_admin BIGINT,
  approved_at     TIMESTAMPTZ,
  active          BOOLEAN              NOT NULL DEFAULT TRUE,

  created_at      TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

-- restaurant-scope rules: unique on (restaurant, type, wrong_value)
CREATE UNIQUE INDEX uq_memory_restaurant
  ON menu_learning_memory (restaurant_id, pattern_type, wrong_value)
  WHERE scope = 'restaurant' AND deleted_at IS NULL;

-- cuisine-scope rules: unique on (cuisine, type, wrong_value)
CREATE UNIQUE INDEX uq_memory_cuisine
  ON menu_learning_memory (cuisine_type, pattern_type, wrong_value)
  WHERE scope = 'cuisine' AND deleted_at IS NULL;

-- global-scope rules: unique on (type, wrong_value)
CREATE UNIQUE INDEX uq_memory_global
  ON menu_learning_memory (pattern_type, wrong_value)
  WHERE scope = 'global' AND deleted_at IS NULL;

CREATE INDEX idx_memory_scope_active
  ON menu_learning_memory (scope, pattern_type, active)
  WHERE deleted_at IS NULL;
```

> **Anti-corruption rule**: a single correction inserts/updates only `restaurant`-scope rows. Promotion to `cuisine` and `global` is performed by the `learning.promote` job under thresholds (see Learning Memory spec).

### 3.11 `menu_import_audit_log` (append-only)

```sql
CREATE TABLE menu_import_audit_log (
  id                 BIGSERIAL PRIMARY KEY,
  menu_import_id     BIGINT       NOT NULL REFERENCES menu_imports(id) ON DELETE CASCADE,
  menu_import_row_id BIGINT       REFERENCES menu_import_rows(id) ON DELETE SET NULL,

  actor_user_id      BIGINT,                              -- NULL for system
  action             audit_action NOT NULL,
  attempt_no         INTEGER      NOT NULL DEFAULT 1,
  idempotency_key    TEXT,
  http_method        TEXT,
  http_url           TEXT,
  http_status        INTEGER,
  duration_ms        INTEGER,

  request_payload    JSONB,
  response_payload   JSONB,
  error_message      TEXT,

  created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_import      ON menu_import_audit_log (menu_import_id, created_at DESC);
CREATE INDEX idx_audit_row         ON menu_import_audit_log (menu_import_row_id);
CREATE INDEX idx_audit_action      ON menu_import_audit_log (action);
CREATE INDEX idx_audit_idem        ON menu_import_audit_log (idempotency_key);
```

### 3.12 `menu_import_idempotency_keys` (production-grade, Phase 1)

Dedicated store for idempotency keys across scopes (upload, process, approve, sync). Enables strict "reject on replay" without scanning the audit log.

```sql
CREATE TABLE menu_import_idempotency_keys (
  id              BIGSERIAL PRIMARY KEY,
  restaurant_id   BIGINT       NOT NULL,
  scope           TEXT         NOT NULL,         -- 'upload' | 'process' | 'approve' | 'sync' | 'rollback'
  key             TEXT         NOT NULL,         -- client-provided or derived
  menu_import_id  BIGINT       REFERENCES menu_imports(id) ON DELETE CASCADE,
  response_body   JSONB,                          -- cached response for safe replay
  http_status     INTEGER,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW() + INTERVAL '7 days'
);

CREATE UNIQUE INDEX uq_idem_scope_key ON menu_import_idempotency_keys (restaurant_id, scope, key);
CREATE INDEX idx_idem_expires          ON menu_import_idempotency_keys (expires_at);
```

A small cron deletes expired rows daily.

---

### 3.13 `menu_import_admin_actions` (production-grade, Phase 2+)

Admin audit for learning memory governance: approvals, suppressions, deactivations. Separate from `menu_import_audit_log` (which is sync-focused).

```sql
CREATE TABLE menu_import_admin_actions (
  id                  BIGSERIAL PRIMARY KEY,
  admin_user_id       BIGINT       NOT NULL,
  action              TEXT         NOT NULL,    -- 'approve_global' | 'suppress_candidate' | 'deactivate_rule' | 'reactivate_rule' | 'promote_cuisine'
  memory_rule_id      BIGINT       REFERENCES menu_learning_memory(id) ON DELETE SET NULL,
  scope               memory_scope,
  reason              TEXT,
  payload_snapshot    JSONB,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admin_actions_rule ON menu_import_admin_actions (memory_rule_id, created_at DESC);
CREATE INDEX idx_admin_actions_user ON menu_import_admin_actions (admin_user_id, created_at DESC);
```

Append-only (same trigger pattern as audit_log).

---

### 3.14 `menu_import_draft_snapshots` (production-grade, Phase 1)

Lightweight per-user snapshots of review state, for end-of-day checkpoints and support rescue.

```sql
CREATE TABLE menu_import_draft_snapshots (
  id               BIGSERIAL PRIMARY KEY,
  menu_import_id   BIGINT       NOT NULL REFERENCES menu_imports(id) ON DELETE CASCADE,
  created_by       BIGINT       NOT NULL,
  label            TEXT,                          -- optional user label, e.g., 'before-dinner-review'
  snapshot         JSONB        NOT NULL,         -- compact serialization of rows + children state
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_drafts_import ON menu_import_draft_snapshots (menu_import_id, created_at DESC);
```

Snapshots are read-only for the user; support / ops can restore from them via a controlled admin endpoint. Retention: 30 days default; configurable per restaurant plan.

---

### 3.15 (Optional, P1) `menu_import_dataset_manifest`

```sql
CREATE TABLE menu_import_dataset_manifest (
  id                BIGSERIAL PRIMARY KEY,
  file_name         TEXT     NOT NULL,
  sha256            CHAR(64) NOT NULL UNIQUE,
  size_bytes        BIGINT   NOT NULL,
  mime              TEXT     NOT NULL,
  source            TEXT     NOT NULL,          -- 'public', 'partner', 'pilot_restaurant_anon'
  downloaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  format            TEXT     NOT NULL,          -- typed-pdf | phone-photo | scanned-image | screenshot | handwritten
  cuisine           TEXT     NOT NULL,
  complexity        TEXT     NOT NULL,
  language          TEXT     NOT NULL,
  bucket            TEXT     NOT NULL,          -- 'calibration' | 'test' | 'holdout'
  notes             TEXT
);

CREATE INDEX idx_manifest_bucket ON menu_import_dataset_manifest (bucket);
CREATE INDEX idx_manifest_format ON menu_import_dataset_manifest (format);
```

---

## 4. Relationships (ERD textual)

```
menu_imports (1) ──< menu_import_pages (M)
menu_imports (1) ──< menu_import_rows (M)
menu_import_pages (1) ──< menu_import_rows (M)
menu_import_rows (1) ──< menu_import_row_variants (M)
menu_import_rows (1) ──< menu_import_row_addons (M)
menu_import_rows (1) ──< menu_import_modifier_groups (M)   [optional, P1]
menu_import_modifier_groups (1) ──< menu_import_modifier_options (M)
menu_imports (1) ──< menu_import_menu_notes (M)
menu_imports (1) ──< menu_import_corrections (M)
menu_imports (1) ──< menu_import_audit_log (M)
menu_learning_memory  (independent; tenant scoped via 'scope' + restaurant_id/cuisine_type)
```

---

## 5. Triggers / Constraints

### 5.1 `updated_at` auto-bump

```sql
CREATE OR REPLACE FUNCTION menu_import.bump_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach to every table that has updated_at
DO $$ DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'menu_imports','menu_import_pages','menu_import_rows',
    'menu_import_row_variants','menu_import_row_addons',
    'menu_import_modifier_groups','menu_import_modifier_options',
    'menu_import_menu_notes','menu_learning_memory'
  ]) LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%I_bump BEFORE UPDATE ON menu_import.%I
       FOR EACH ROW EXECUTE FUNCTION menu_import.bump_updated_at();',
      t, t);
  END LOOP;
END $$;
```

### 5.2 Append-only guard on corrections + audit_log

```sql
CREATE OR REPLACE FUNCTION menu_import.refuse_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'menu_import.% is append-only', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_corrections_no_update BEFORE UPDATE ON menu_import_corrections
  FOR EACH ROW EXECUTE FUNCTION menu_import.refuse_mutation();
CREATE TRIGGER trg_corrections_no_delete BEFORE DELETE ON menu_import_corrections
  FOR EACH ROW EXECUTE FUNCTION menu_import.refuse_mutation();

CREATE TRIGGER trg_audit_no_update BEFORE UPDATE ON menu_import_audit_log
  FOR EACH ROW EXECUTE FUNCTION menu_import.refuse_mutation();
CREATE TRIGGER trg_audit_no_delete BEFORE DELETE ON menu_import_audit_log
  FOR EACH ROW EXECUTE FUNCTION menu_import.refuse_mutation();
```

### 5.3 Optimistic concurrency on `menu_import_rows`

Application enforces: every `UPDATE` includes `WHERE id = $1 AND version = $2`; on success increments `version`. A 409 is returned on no-rows-affected.

### 5.4 Row-level CHECK constraints

```sql
ALTER TABLE menu_import_rows
  ADD CONSTRAINT chk_rate_nonneg
  CHECK (rate IS NULL OR rate >= 0);

ALTER TABLE menu_import_rows
  ADD CONSTRAINT chk_corrected_rate_nonneg
  CHECK (corrected_rate IS NULL OR corrected_rate >= 0);

ALTER TABLE menu_import_row_variants
  ADD CONSTRAINT chk_variant_price_nonneg
  CHECK (variant_price IS NULL OR variant_price >= 0);

ALTER TABLE menu_import_row_addons
  ADD CONSTRAINT chk_addon_price_nonneg
  CHECK (addon_price IS NULL OR addon_price >= 0);

ALTER TABLE menu_import_rows
  ADD CONSTRAINT chk_confidence_range
  CHECK (confidence_score >= 0 AND confidence_score <= 1);
```

---

## 6. Views

### 6.1 `v_active_review_rows` — convenience for the review UI

```sql
CREATE OR REPLACE VIEW v_active_review_rows AS
SELECT
  r.*,
  COALESCE(r.corrected_item_name, r.item_name)         AS effective_item_name,
  COALESCE(r.corrected_category,  r.category)          AS effective_category,
  COALESCE(r.corrected_subcategory, r.subcategory)     AS effective_subcategory,
  COALESCE(r.corrected_rate,      r.rate)              AS effective_rate,
  COALESCE(r.corrected_food_type, r.food_type)         AS effective_food_type,
  COALESCE(r.corrected_pricing_type, r.pricing_type)   AS effective_pricing_type,
  COALESCE(r.corrected_unit,      r.unit)              AS effective_unit,
  COALESCE(r.corrected_description, r.description)     AS effective_description
FROM menu_import_rows r
WHERE r.status NOT IN ('rejected', 'merged', 'converted_to_variant', 'converted_to_addon');
```

### 6.2 `v_import_progress` — used by status polling

```sql
CREATE OR REPLACE VIEW v_import_progress AS
SELECT
  i.id AS menu_import_id,
  i.status,
  i.total_pages,
  COUNT(p.*) FILTER (WHERE p.processing_status = 'extracted') AS pages_extracted,
  COUNT(p.*) FILTER (WHERE p.processing_status = 'failed')    AS pages_failed,
  i.total_rows_extracted,
  i.total_rows_approved,
  i.total_rows_rejected,
  i.total_rows_synced,
  i.total_rows_sync_failed,
  i.updated_at
FROM menu_imports i
LEFT JOIN menu_import_pages p ON p.menu_import_id = i.id
GROUP BY i.id;
```

---

## 7. Tenant Isolation Strategy

- Every query in the application runs through a repository that **always** appends `WHERE restaurant_id = :ctx.restaurant_id` for tenant-scoped tables.
- Defense-in-depth (recommended for prod): enable PostgreSQL **Row-Level Security** on tenant-scoped tables and bind a per-request session GUC `app.restaurant_id` from the Auth Guard:

```sql
ALTER TABLE menu_imports          ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_import_rows      ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_import_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_imports ON menu_imports
  USING (restaurant_id = current_setting('app.restaurant_id', true)::BIGINT);
CREATE POLICY tenant_isolation_rows ON menu_import_rows
  USING (restaurant_id = current_setting('app.restaurant_id', true)::BIGINT);
CREATE POLICY tenant_isolation_corrections ON menu_import_corrections
  USING (restaurant_id = current_setting('app.restaurant_id', true)::BIGINT);

-- (Workers and admins use a privileged role that bypasses RLS.)
```

Decision: enable RLS in prod; optional in pre-prod. To be confirmed in Open Questions.

---

## 8. Indexing Strategy Summary

| Table | Hot Indexes |
|---|---|
| `menu_imports` | `(restaurant_id, status, created_at DESC)`, `(restaurant_id, file_hash)` |
| `menu_import_pages` | `(menu_import_id, processing_status)` |
| `menu_import_rows` | `(menu_import_id, status)`, `(restaurant_id, status)`, GIN on `warnings_json`, trigram on `item_name` |
| `menu_import_row_variants` | `(menu_import_row_id, status)`, unique on `(row_id, name)` |
| `menu_import_row_addons` | `(menu_import_row_id, status)` |
| `menu_import_corrections` | `(restaurant_id, created_at DESC)`, `(menu_import_row_id)` |
| `menu_learning_memory` | unique partial per scope, `(scope, pattern_type, active)` |
| `menu_import_audit_log` | `(menu_import_id, created_at DESC)` |

---

## 9. Retention + Lifecycle

| Table | Retention |
|---|---|
| `menu_imports` (terminal) | 24 months hot, then archive (S3 Glacier) |
| `menu_import_pages` | 6 months hot, then delete page images; metadata retained |
| `menu_import_rows` (terminal) | mirror parent import retention |
| `menu_import_corrections` | 13 months minimum, indefinite preferred (small + valuable) |
| `menu_learning_memory` | indefinite while `active=true` |
| `menu_import_audit_log` | 13 months minimum, exportable to cold storage |

A nightly job moves cold rows to a `menu_import_archive.*` schema (P1).

---

## 10. Migrations

- All migrations versioned (`prisma migrate` or `knex migrate`).
- Migrations are forward-only; rollbacks via compensating migrations only.
- ENUM additions: use `ALTER TYPE ... ADD VALUE` (Postgres supports this without rewrite).
- Index creation in prod uses `CREATE INDEX CONCURRENTLY`.

---

## 11. Sample Queries

### "Rows for review UI, with children"

```sql
SELECT
  r.*,
  COALESCE(json_agg(DISTINCT v.*) FILTER (WHERE v.id IS NOT NULL), '[]') AS variants,
  COALESCE(json_agg(DISTINCT a.*) FILTER (WHERE a.id IS NOT NULL), '[]') AS addons
FROM menu_import_rows r
LEFT JOIN menu_import_row_variants v ON v.menu_import_row_id = r.id
LEFT JOIN menu_import_row_addons   a ON a.menu_import_row_id = r.id
WHERE r.menu_import_id = :id
  AND r.restaurant_id = :restaurant_id
  AND r.status NOT IN ('rejected','merged','converted_to_variant','converted_to_addon')
GROUP BY r.id
ORDER BY r.display_order, r.id;
```

### "Restaurant-scope memory candidates for this import"

```sql
SELECT *
FROM menu_learning_memory
WHERE scope = 'restaurant'
  AND restaurant_id = :restaurant_id
  AND pattern_type IN ('spelling','category_mapping','food_type','unit_pricing')
  AND active = TRUE
  AND deleted_at IS NULL;
```

### "Promote restaurant rule to cuisine"

```sql
WITH agg AS (
  SELECT pattern_type, wrong_value, correct_value,
         COUNT(DISTINCT restaurant_id) AS restaurants,
         SUM(usage_count)              AS total_uses
  FROM menu_learning_memory
  WHERE scope = 'restaurant'
    AND active = TRUE AND deleted_at IS NULL
  GROUP BY pattern_type, wrong_value, correct_value
)
INSERT INTO menu_learning_memory
  (scope, cuisine_type, pattern_type, wrong_value, correct_value,
   confidence, usage_count, distinct_restaurants, last_used_at)
SELECT
  'cuisine'::memory_scope,
  :cuisine_type,
  agg.pattern_type, agg.wrong_value, agg.correct_value,
  LEAST(0.95, 0.5 + (agg.restaurants::numeric / 20.0)),
  agg.total_uses,
  agg.restaurants,
  NOW()
FROM agg
WHERE agg.restaurants >= 3
ON CONFLICT (cuisine_type, pattern_type, wrong_value)
WHERE scope = 'cuisine' AND deleted_at IS NULL
DO UPDATE SET
  correct_value         = EXCLUDED.correct_value,
  confidence            = GREATEST(menu_learning_memory.confidence, EXCLUDED.confidence),
  usage_count           = menu_learning_memory.usage_count + EXCLUDED.usage_count,
  distinct_restaurants  = EXCLUDED.distinct_restaurants,
  last_used_at          = NOW();
```

---

## 12. Open Schema Questions (cross-link)

See `MENU_IMPORT_MVP_OPEN_QUESTIONS.md` for:
- BIGSERIAL vs UUID for primary keys.
- Whether RLS is enabled in pre-prod.
- Per-restaurant retention overrides.
- Whether `menu_import_audit_log` should be partitioned by month from day one.
- Sharing of `menu_learning_memory` across staging/prod environments.
