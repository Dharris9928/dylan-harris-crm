-- Drop the index that depends on pg_trgm, then move extension, then recreate index
DROP INDEX IF EXISTS idx_companies_name_trgm;
DROP EXTENSION IF EXISTS pg_trgm CASCADE;
CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA extensions;

-- Recreate the index with the extension in the correct schema
CREATE INDEX idx_companies_name_trgm ON companies USING gin (company_name extensions.gin_trgm_ops);