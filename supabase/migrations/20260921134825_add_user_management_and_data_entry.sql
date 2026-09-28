/*
# User Management, Roles, and Data Entry Schema

## Overview
Adds authentication-based user management with three roles (admin, gerente, operador),
per-operator area permissions, and a data_entries table for operators to input
the raw values that feed each KPI.

## New Tables

1. `profiles` — Extends Supabase auth.users with role and display info
   - `id` (uuid, FK to auth.users, PK)
   - `email` (text)
   - `full_name` (text)
   - `role` (text: 'admin' | 'gerente' | 'operador')
   - `active` (boolean, default true)
   - `created_at` (timestamptz)

2. `user_areas` — Links operators to the areas they can access
   - `id` (uuid, PK)
   - `user_id` (uuid, FK to profiles)
   - `area_id` (uuid, FK to areas)
   - `created_at` (timestamptz)
   - Unique constraint on (user_id, area_id)

3. `data_entries` — Raw data inputs by operators for each KPI
   - `id` (uuid, PK)
   - `kpi_id` (uuid, FK to kpis)
   - `user_id` (uuid, FK to profiles, defaults to auth.uid())
   - `value` (numeric, the entered value)
   - `entry_date` (date, the period the value refers to)
   - `notes` (text, optional)
   - `created_at` (timestamptz)

## Security
- RLS enabled on all new tables
- profiles: authenticated users can read all profiles; only admin can insert/update/delete
- user_areas: authenticated can read; only admin can insert/update/delete
- data_entries: authenticated can read all; authenticated users can insert their own;
  admin can delete any; users can update/delete their own
- Existing areas/kpis/kpi_data/kpi_breakdowns tables: policies updated to TO authenticated
  (previously anon+authenticated) since the app now requires sign-in
*/

-- ============================================================
-- PROFILES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'operador' CHECK (role IN ('admin', 'gerente', 'operador')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read profiles (needed to see who entered data)
DROP POLICY IF EXISTS "auth_select_profiles" ON profiles;
CREATE POLICY "auth_select_profiles" ON profiles FOR SELECT
  TO authenticated USING (true);

-- Only admin can insert profiles
DROP POLICY IF EXISTS "admin_insert_profiles" ON profiles;
CREATE POLICY "admin_insert_profiles" ON profiles FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Only admin can update profiles
DROP POLICY IF EXISTS "admin_update_profiles" ON profiles;
CREATE POLICY "admin_update_profiles" ON profiles FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Only admin can delete profiles
DROP POLICY IF EXISTS "admin_delete_profiles" ON profiles;
CREATE POLICY "admin_delete_profiles" ON profiles FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ============================================================
-- USER_AREAS TABLE (operator area permissions)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  area_id uuid NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, area_id)
);

ALTER TABLE user_areas ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read user_areas
DROP POLICY IF EXISTS "auth_select_user_areas" ON user_areas;
CREATE POLICY "auth_select_user_areas" ON user_areas FOR SELECT
  TO authenticated USING (true);

-- Only admin can insert
DROP POLICY IF EXISTS "admin_insert_user_areas" ON user_areas;
CREATE POLICY "admin_insert_user_areas" ON user_areas FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Only admin can update
DROP POLICY IF EXISTS "admin_update_user_areas" ON user_areas;
CREATE POLICY "admin_update_user_areas" ON user_areas FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Only admin can delete
DROP POLICY IF EXISTS "admin_delete_user_areas" ON user_areas;
CREATE POLICY "admin_delete_user_areas" ON user_areas FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ============================================================
-- DATA_ENTRIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS data_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_id uuid NOT NULL REFERENCES kpis(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  value numeric NOT NULL DEFAULT 0,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_data_entries_kpi_id ON data_entries(kpi_id);
CREATE INDEX IF NOT EXISTS idx_data_entries_entry_date ON data_entries(entry_date);

ALTER TABLE data_entries ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read all data entries
DROP POLICY IF EXISTS "auth_select_data_entries" ON data_entries;
CREATE POLICY "auth_select_data_entries" ON data_entries FOR SELECT
  TO authenticated USING (true);

-- Any authenticated user can insert their own entries
DROP POLICY IF EXISTS "auth_insert_data_entries" ON data_entries;
CREATE POLICY "auth_insert_data_entries" ON data_entries FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- Users can update their own entries; admin can update any
DROP POLICY IF EXISTS "auth_update_data_entries" ON data_entries;
CREATE POLICY "auth_update_data_entries" ON data_entries FOR UPDATE
  TO authenticated USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ) WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Users can delete their own entries; admin can delete any
DROP POLICY IF EXISTS "auth_delete_data_entries" ON data_entries;
CREATE POLICY "auth_delete_data_entries" ON data_entries FOR DELETE
  TO authenticated USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ============================================================
-- Update existing tables' policies from anon to authenticated
-- (app now requires sign-in)
-- ============================================================

-- areas
DROP POLICY IF EXISTS "anon_crud_areas" ON areas;
DROP POLICY IF EXISTS "auth_select_areas" ON areas;
CREATE POLICY "auth_select_areas" ON areas FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_areas" ON areas;
CREATE POLICY "auth_insert_areas" ON areas FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "auth_update_areas" ON areas;
CREATE POLICY "auth_update_areas" ON areas FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "auth_delete_areas" ON areas;
CREATE POLICY "auth_delete_areas" ON areas FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- kpis
DROP POLICY IF EXISTS "anon_crud_kpis" ON kpis;
DROP POLICY IF EXISTS "auth_select_kpis" ON kpis;
CREATE POLICY "auth_select_kpis" ON kpis FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_kpis" ON kpis;
CREATE POLICY "auth_insert_kpis" ON kpis FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "auth_update_kpis" ON kpis;
CREATE POLICY "auth_update_kpis" ON kpis FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "auth_delete_kpis" ON kpis;
CREATE POLICY "auth_delete_kpis" ON kpis FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- kpi_data
DROP POLICY IF EXISTS "anon_crud_kpi_data" ON kpi_data;
DROP POLICY IF EXISTS "auth_select_kpi_data" ON kpi_data;
CREATE POLICY "auth_select_kpi_data" ON kpi_data FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_kpi_data" ON kpi_data;
CREATE POLICY "auth_insert_kpi_data" ON kpi_data FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'operador'))
  );

DROP POLICY IF EXISTS "auth_update_kpi_data" ON kpi_data;
CREATE POLICY "auth_update_kpi_data" ON kpi_data FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'operador'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'operador'))
  );

DROP POLICY IF EXISTS "auth_delete_kpi_data" ON kpi_data;
CREATE POLICY "auth_delete_kpi_data" ON kpi_data FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- kpi_breakdowns
DROP POLICY IF EXISTS "anon_crud_kpi_breakdowns" ON kpi_breakdowns;
DROP POLICY IF EXISTS "anon_select_kpi_breakdowns" ON kpi_breakdowns;
DROP POLICY IF EXISTS "auth_select_kpi_breakdowns" ON kpi_breakdowns;
CREATE POLICY "auth_select_kpi_breakdowns" ON kpi_breakdowns FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_kpi_breakdowns" ON kpi_breakdowns;
CREATE POLICY "auth_insert_kpi_breakdowns" ON kpi_breakdowns FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'operador'))
  );

DROP POLICY IF EXISTS "auth_update_kpi_breakdowns" ON kpi_breakdowns;
CREATE POLICY "auth_update_kpi_breakdowns" ON kpi_breakdowns FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'operador'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'operador'))
  );

DROP POLICY IF EXISTS "auth_delete_kpi_breakdowns" ON kpi_breakdowns;
CREATE POLICY "auth_delete_kpi_breakdowns" ON kpi_breakdowns FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ============================================================
-- Trigger: auto-create profile on auth user signup
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 'operador')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();