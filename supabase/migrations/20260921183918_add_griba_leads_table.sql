CREATE TABLE IF NOT EXISTS griba_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text,
  name text,
  email text,
  phone text,
  source text,
  status text DEFAULT 'nuevo',
  vehicle_interest text,
  notes text,
  raw_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  fetched_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_griba_leads_status ON griba_leads(status);
CREATE INDEX IF NOT EXISTS idx_griba_leads_external_id ON griba_leads(external_id);

ALTER TABLE griba_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_griba_leads" ON griba_leads;
CREATE POLICY "auth_select_griba_leads" ON griba_leads FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_griba_leads" ON griba_leads;
CREATE POLICY "admin_insert_griba_leads" ON griba_leads FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "admin_update_griba_leads" ON griba_leads;
CREATE POLICY "admin_update_griba_leads" ON griba_leads FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "admin_delete_griba_leads" ON griba_leads;
CREATE POLICY "admin_delete_griba_leads" ON griba_leads FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );