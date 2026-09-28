/*
# Add result_field_id to formulas and field_role to custom_fields

1. Changes to `formulas` table:
- Add `result_field_id` (uuid, nullable, FK to custom_fields) — stores which custom field the formula result is saved into.

2. Changes to `custom_fields` table:
- Add `field_role` (text, default 'input') — 'input' for blue input fields, 'result' for red result fields.

3. Security:
- No policy changes needed; existing policies cover the new columns.
*/

ALTER TABLE formulas ADD COLUMN IF NOT EXISTS result_field_id uuid REFERENCES custom_fields(id) ON DELETE SET NULL;

ALTER TABLE custom_fields ADD COLUMN IF NOT EXISTS field_role text NOT NULL DEFAULT 'input';

DROP POLICY IF EXISTS "select_formulas_authenticated" ON formulas;
CREATE POLICY "select_formulas_authenticated"
ON formulas FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_formulas_admin" ON formulas;
CREATE POLICY "insert_formulas_admin"
ON formulas FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

DROP POLICY IF EXISTS "update_formulas_admin" ON formulas;
CREATE POLICY "update_formulas_admin"
ON formulas FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

DROP POLICY IF EXISTS "delete_formulas_admin" ON formulas;
CREATE POLICY "delete_formulas_admin"
ON formulas FOR DELETE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
