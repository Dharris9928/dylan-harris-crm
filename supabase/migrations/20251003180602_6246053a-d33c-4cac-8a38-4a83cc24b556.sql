-- Add detailed error logging to import_export_logs table
ALTER TABLE import_export_logs
ADD COLUMN IF NOT EXISTS detailed_errors jsonb;

COMMENT ON COLUMN import_export_logs.detailed_errors IS 'Detailed list of errors with row numbers and error messages';