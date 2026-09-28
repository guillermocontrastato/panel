/*
# Custom Fields, Formulas, API Connections, Firecrawl, Data Source Config

## Overview
Adds infrastructure for:
1. Custom fields that admins create and assign to areas + KPIs
2. Field values submitted by operators during data entry
3. Custom formulas that compute derived values from fields
4. API connections to external systems
5. Firecrawl connections for web scraping
6. Per-KPI data source configuration (operator, external, or both)

## New Tables

1. `custom_fields` — Admin-defined fields attached to areas/KPIs
   - id, area_id (FK), kpi_id (FK nullable), name, label, field_type, sort_order, created_at

2. `field_values` — Values submitted by operators for custom fields
   - id, field_id (FK), user_id (FK), value_text, value_number, value_date, entry_date, created_at

3. `formulas` — Custom formulas that compute from custom fields
   - id, kpi_id (FK), name, expression, field_mapping (jsonb), sort_order, created_at

4. `api_connections` — External API connection configs
   - id, name, base_url, auth_type, auth_config (jsonb), is_active, created_at

5. `firecrawl_connections` — Firecrawl web scraping configs
   - id, name, target_url, credentials (jsonb), is_active, created_at

6. `data_source_config` — Per-KPI config: where data comes from
   - id, kpi_id (FK unique), source_type ('operator', 'external', 'both'), created_at

## Security
- RLS enabled on all new tables
- Admin-only for create/update/delete on all config tables
- All authenticated users can read custom_fields, field_values, formulas
- api_connections and firecrawl_connections: admin-only read/write (sensitive credentials)
- data_source_config: admin-only write, authenticated read
*/

-- ============================================================
-- CUSTOM FIELDS
-- ============================================================
CREATE TABLE IF NOT EXISTS custom_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id uuid NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  kpi_id uuid REFERENCES kpis(id) ON DELETE CASCADE,
  name text NOT NULL,
  label text NOT NULL,
  field_type text NOT NULL DEFAULT 'text' CHECK (field_type IN ('text', 'numeric', 'date', 'datetime', 'boolean', 'select', 'textarea')),
  options jsonb DEFAULT '[]'::jsonb,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_custom_fields_area_id ON custom_fields(area_id);
CREATE INDEX IF NOT EXISTS idx_custom_fields_kpi_id ON custom_fields(kpi_id);

ALTER TABLE custom_fields ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_custom_fields" ON custom_fields;
CREATE POLICY "auth_select_custom_fields" ON custom_fields FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_custom_fields" ON custom_fields;
CREATE POLICY "admin_insert_custom_fields" ON custom_fields FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "admin_update_custom_fields" ON custom_fields;
CREATE POLICY "admin_update_custom_fields" ON custom_fields FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "admin_delete_custom_fields" ON custom_fields;
CREATE POLICY "admin_delete_custom_fields" ON custom_fields FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ============================================================
-- FIELD VALUES
-- ============================================================
CREATE TABLE IF NOT EXISTS field_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id uuid NOT NULL REFERENCES custom_fields(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  value_text text DEFAULT '',
  value_number numeric,
  value_date timestamptz,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_field_values_field_id ON field_values(field_id);
CREATE INDEX IF NOT EXISTS idx_field_values_entry_date ON field_values(entry_date);

ALTER TABLE field_values ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_field_values" ON field_values;
CREATE POLICY "auth_select_field_values" ON field_values FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_field_values" ON field_values;
CREATE POLICY "auth_insert_field_values" ON field_values FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "auth_update_field_values" ON field_values;
CREATE POLICY "auth_update_field_values" ON field_values FOR UPDATE
  TO authenticated USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ) WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "auth_delete_field_values" ON field_values;
CREATE POLICY "auth_delete_field_values" ON field_values FOR DELETE
  TO authenticated USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ============================================================
-- FORMULAS
-- ============================================================
CREATE TABLE IF NOT EXISTS formulas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_id uuid NOT NULL REFERENCES kpis(id) ON DELETE CASCADE,
  name text NOT NULL,
  expression text NOT NULL,
  field_mapping jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_formulas_kpi_id ON formulas(kpi_id);

ALTER TABLE formulas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_formulas" ON formulas;
CREATE POLICY "auth_select_formulas" ON formulas FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_formulas" ON formulas;
CREATE POLICY "admin_insert_formulas" ON formulas FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "admin_update_formulas" ON formulas;
CREATE POLICY "admin_update_formulas" ON formulas FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "admin_delete_formulas" ON formulas;
CREATE POLICY "admin_delete_formulas" ON formulas FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ============================================================
-- API CONNECTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS api_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  base_url text NOT NULL,
  auth_type text NOT NULL DEFAULT 'bearer' CHECK (auth_type IN ('bearer', 'api_key', 'basic', 'none')),
  auth_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE api_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_select_api_connections" ON api_connections;
CREATE POLICY "admin_select_api_connections" ON api_connections FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "admin_insert_api_connections" ON api_connections;
CREATE POLICY "admin_insert_api_connections" ON api_connections FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "admin_update_api_connections" ON api_connections;
CREATE POLICY "admin_update_api_connections" ON api_connections FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "admin_delete_api_connections" ON api_connections;
CREATE POLICY "admin_delete_api_connections" ON api_connections FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ============================================================
-- FIRECRAWL CONNECTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS firecrawl_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  target_url text NOT NULL,
  credentials jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE firecrawl_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_select_firecrawl_connections" ON firecrawl_connections;
CREATE POLICY "admin_select_firecrawl_connections" ON firecrawl_connections FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "admin_insert_firecrawl_connections" ON firecrawl_connections;
CREATE POLICY "admin_insert_firecrawl_connections" ON firecrawl_connections FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "admin_update_firecrawl_connections" ON firecrawl_connections;
CREATE POLICY "admin_update_firecrawl_connections" ON firecrawl_connections FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "admin_delete_firecrawl_connections" ON firecrawl_connections;
CREATE POLICY "admin_delete_firecrawl_connections" ON firecrawl_connections FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ============================================================
-- DATA SOURCE CONFIG (per KPI)
-- ============================================================
CREATE TABLE IF NOT EXISTS data_source_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_id uuid NOT NULL UNIQUE REFERENCES kpis(id) ON DELETE CASCADE,
  source_type text NOT NULL DEFAULT 'operator' CHECK (source_type IN ('operator', 'external', 'both')),
  api_connection_id uuid REFERENCES api_connections(id) ON DELETE SET NULL,
  firecrawl_connection_id uuid REFERENCES firecrawl_connections(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_data_source_config_kpi_id ON data_source_config(kpi_id);

ALTER TABLE data_source_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_data_source_config" ON data_source_config;
CREATE POLICY "auth_select_data_source_config" ON data_source_config FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_data_source_config" ON data_source_config;
CREATE POLICY "admin_insert_data_source_config" ON data_source_config FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "admin_update_data_source_config" ON data_source_config;
CREATE POLICY "admin_update_data_source_config" ON data_source_config FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "admin_delete_data_source_config" ON data_source_config;
CREATE POLICY "admin_delete_data_source_config" ON data_source_config FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );