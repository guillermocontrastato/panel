/*
# Add results_json and inputs_json to data_entries

1. Changes to `data_entries` table:
- Add `results_json` (jsonb, nullable) — stores ALL computed result field values for this entry
- Add `inputs_json` (jsonb, nullable) — stores ALL input field values submitted by the user

2. Purpose:
- Previously, data_entries only stored a single `value` (the first result field).
- Now every result field value is saved as a JSON map: { field_id: { label, value } }
- Input field values are also saved so the history can show what was entered.
- The single `value` column remains for backwards compatibility (set to the first result).

3. Security:
- No policy changes needed; existing policies cover the new columns.
*/

ALTER TABLE data_entries ADD COLUMN IF NOT EXISTS results_json jsonb DEFAULT '{}'::jsonb;
ALTER TABLE data_entries ADD COLUMN IF NOT EXISTS inputs_json jsonb DEFAULT '{}'::jsonb;