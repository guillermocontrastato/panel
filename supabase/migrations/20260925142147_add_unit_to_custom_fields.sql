/*
# Add per-field display units

1. Modified Tables
- `custom_fields`: add `unit` (text, default '%') so every result field can
  define independently how its calculated value is displayed.

2. Compatibility
- Existing custom fields receive the percentage default without changing or
  deleting any existing data.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'custom_fields' AND column_name = 'unit'
  ) THEN
    ALTER TABLE custom_fields ADD COLUMN unit text NOT NULL DEFAULT '%';
  END IF;
END $$;
