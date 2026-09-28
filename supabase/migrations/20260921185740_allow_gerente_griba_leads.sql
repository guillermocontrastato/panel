-- Allow gerente to also insert/update/delete griba_leads
DROP POLICY IF EXISTS "admin_insert_griba_leads" ON griba_leads;
DROP POLICY IF EXISTS "admin_update_griba_leads" ON griba_leads;
DROP POLICY IF EXISTS "admin_delete_griba_leads" ON griba_leads;

CREATE POLICY "manager_insert_griba_leads" ON griba_leads FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'gerente'))
  );

CREATE POLICY "manager_update_griba_leads" ON griba_leads FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'gerente'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'gerente'))
  );

CREATE POLICY "manager_delete_griba_leads" ON griba_leads FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'gerente'))
  );