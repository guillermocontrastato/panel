/*
# Add color column to custom_fields

1. Modified Tables
- `custom_fields`: add `color` (text, default 'emerald') to allow choosing the
  card color shown in the dashboard for result fields. Defaults to green.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'custom_fields' AND column_name = 'color'
  ) THEN
    ALTER TABLE custom_fields ADD COLUMN color text NOT NULL DEFAULT 'emerald';
  END IF;
END $$;
