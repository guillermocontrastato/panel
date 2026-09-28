/*
# Create KPI Dashboard Schema for Ruiz Automotores

## Overview
Creates a comprehensive management indicators dashboard with 7 business areas and their KPIs.
Single-tenant (no auth) — all data is shared/public.

## New Tables
1. `areas` — Business areas (Ventas 0km, Plan Rombo, Mi Auto Ya!, Postventa, Calidad, RRHH, Adm. y Finanzas)
2. `kpis` — KPI definitions per area with formulas, definitions, decisions they enable
3. `kpi_data` — Actual KPI values with current value, target, previous value, trend, and monthly series
4. `kpi_breakdowns` — Detailed breakdown rows for each KPI (e.g. by vendedor, modelo, canal)

## Security
- RLS enabled on all tables
- Anon + authenticated CRUD (single-tenant, no auth)
*/

-- Business areas
CREATE TABLE IF NOT EXISTS areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  icon text NOT NULL,
  description text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- KPI definitions
CREATE TABLE IF NOT EXISTS kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id uuid NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  name text NOT NULL,
  definition text NOT NULL,
  formula text NOT NULL,
  decision text NOT NULL,
  unit text NOT NULL DEFAULT '%',
  target_direction text NOT NULL DEFAULT 'up',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- KPI actual data (current snapshot + monthly series stored as JSONB)
CREATE TABLE IF NOT EXISTS kpi_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_id uuid NOT NULL REFERENCES kpis(id) ON DELETE CASCADE,
  current_value numeric NOT NULL DEFAULT 0,
  target_value numeric NOT NULL DEFAULT 0,
  previous_value numeric NOT NULL DEFAULT 0,
  trend text NOT NULL DEFAULT 'stable',
  series jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz DEFAULT now()
);

-- KPI breakdown rows (for detailed sub-data per KPI)
CREATE TABLE IF NOT EXISTS kpi_breakdowns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_id uuid NOT NULL REFERENCES kpis(id) ON DELETE CASCADE,
  label text NOT NULL,
  value numeric NOT NULL DEFAULT 0,
  target numeric,
  extra jsonb DEFAULT '{}'::jsonb,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_breakdowns ENABLE ROW LEVEL SECURITY;

-- Policies: single-tenant, anon + authenticated full access
DROP POLICY IF EXISTS "anon_crud_areas" ON areas;
CREATE POLICY "anon_crud_areas" ON areas FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_crud_kpis" ON kpis;
CREATE POLICY "anon_crud_kpis" ON kpis FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_crud_kpi_data" ON kpi_data;
CREATE POLICY "anon_crud_kpi_data" ON kpi_data FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_crud_kpi_breakdowns" ON kpi_breakdowns;
CREATE POLICY "anon_crud_kpi_breakdowns" ON kpi_data FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_kpi_breakdowns" ON kpi_breakdowns;
CREATE POLICY "anon_select_kpi_breakdowns" ON kpi_breakdowns FOR SELECT TO anon, authenticated USING (true);

-- Insert policy for areas
DROP POLICY IF EXISTS "anon_insert_areas" ON areas;
CREATE POLICY "anon_insert_areas" ON areas FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_insert_kpis" ON kpis;
CREATE POLICY "anon_insert_kpis" ON kpis FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_insert_kpi_data" ON kpi_data;
CREATE POLICY "anon_insert_kpi_data" ON kpi_data FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_insert_kpi_breakdowns" ON kpi_breakdowns;
CREATE POLICY "anon_insert_kpi_breakdowns" ON kpi_breakdowns FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Update policies
DROP POLICY IF EXISTS "anon_update_areas" ON areas;
CREATE POLICY "anon_update_areas" ON areas FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_kpis" ON kpis;
CREATE POLICY "anon_update_kpis" ON kpis FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_kpi_data" ON kpi_data;
CREATE POLICY "anon_update_kpi_data" ON kpi_data FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_kpi_breakdowns" ON kpi_breakdowns;
CREATE POLICY "anon_update_kpi_breakdowns" ON kpi_breakdowns FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- Delete policies
DROP POLICY IF EXISTS "anon_delete_areas" ON areas;
CREATE POLICY "anon_delete_areas" ON areas FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_delete_kpis" ON kpis;
CREATE POLICY "anon_delete_kpis" ON kpis FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_delete_kpi_data" ON kpi_data;
CREATE POLICY "anon_delete_kpi_data" ON kpi_data FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_delete_kpi_breakdowns" ON kpi_breakdowns;
CREATE POLICY "anon_delete_kpi_breakdowns" ON kpi_breakdowns FOR DELETE TO anon, authenticated USING (true);