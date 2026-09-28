-- Allow gerente to also read api_connections (needed for GribaInfo module)
DROP POLICY IF EXISTS "admin_select_api_connections" ON api_connections;
CREATE POLICY "manager_select_api_connections" ON api_connections FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'gerente'))
  );