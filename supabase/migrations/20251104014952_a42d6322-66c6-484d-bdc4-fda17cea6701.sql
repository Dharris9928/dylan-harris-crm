-- Add confidence and unit_needed_date fields to opportunities table
ALTER TABLE opportunities
ADD COLUMN confidence integer,
ADD COLUMN unit_needed_date date;

-- Add comment for clarity
COMMENT ON COLUMN opportunities.confidence IS 'Confidence level in percentage (0-100 in 5% increments)';
COMMENT ON COLUMN opportunities.unit_needed_date IS 'Date when the unit/product will be needed by customer';