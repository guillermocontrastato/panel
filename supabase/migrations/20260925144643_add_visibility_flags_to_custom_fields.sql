/*
# Add visibility flags to custom_fields

1. Modified Tables
- `custom_fields`: add `hidden_in_entry` (boolean, default false) and
  `hidden_in_dashboard` (boolean, default false) so each field can be
  independently hidden from the data entry form and/or the dashboard.

2. Compatibility
- Existing fields default to visible in both places (false), preserving
  current behavior without changing or deleting any existing data.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'custom_fields' AND column_name = 'hidden_in_entry'
  ) THEN
    ALTER TABLE custom_fields ADD COLUMN hidden_in_entry boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'custom_fields' AND column_name = 'hidden_in_dashboard'
  ) THEN
    ALTER TABLE custom_fields ADD COLUMN hidden_in_dashboard boolean NOT NULL DEFAULT false;
  END IF;
END $$;
