/*
# Create notifications table

1. New Tables
- `notifications`
  - id (uuid, primary key)
  - user_id (uuid, FK to auth.users) — the user who triggered the notification (the operator)
  - target_role (text) — 'gerente' or 'admin' (who should see it)
  - area_id (uuid, FK to areas, nullable) — which area the change relates to
  - kpi_id (uuid, FK to kpis, nullable) — which KPI the change relates to
  - action (text) — 'create' or 'update' or 'delete'
  - message (text) — human-readable description
  - is_read (boolean, default false)
  - created_at (timestamptz)

2. Security
- RLS enabled on `notifications`.
- SELECT: gerente and admin can read notifications targeted to their role.
- INSERT: any authenticated user can insert (operators create notifications when they modify data).
- DELETE: gerente and admin can delete notifications (to clear read ones).
- UPDATE: gerente and admin can mark notifications as read.
*/

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  target_role text NOT NULL DEFAULT 'gerente',
  area_id uuid REFERENCES areas(id) ON DELETE SET NULL,
  kpi_id uuid REFERENCES kpis(id) ON DELETE SET NULL,
  action text NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_notifications_for_managers" ON notifications;
CREATE POLICY "select_notifications_for_managers"
ON notifications FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('gerente', 'admin')
    AND p.role = notifications.target_role
  )
  OR user_id = auth.uid()
);

DROP POLICY IF EXISTS "insert_notifications_any_authenticated" ON notifications;
CREATE POLICY "insert_notifications_any_authenticated"
ON notifications FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_notifications_for_managers" ON notifications;
CREATE POLICY "update_notifications_for_managers"
ON notifications FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('gerente', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('gerente', 'admin')
  )
);

DROP POLICY IF EXISTS "delete_notifications_for_managers" ON notifications;
CREATE POLICY "delete_notifications_for_managers"
ON notifications FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('gerente', 'admin')
  )
);

CREATE INDEX IF NOT EXISTS idx_notifications_target_role_created_at
ON notifications (target_role, created_at DESC);
