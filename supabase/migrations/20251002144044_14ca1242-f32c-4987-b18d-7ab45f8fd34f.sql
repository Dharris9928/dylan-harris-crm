-- Verify the annual_revenue_range field exists and has proper constraints
ALTER TABLE Companies
  DROP CONSTRAINT IF EXISTS companies_annual_revenue_range_check;

ALTER TABLE Companies
  ADD CONSTRAINT companies_annual_revenue_range_check CHECK (
    annual_revenue_range IS NULL OR
    annual_revenue_range IN (
      -- Contractor ranges
      '$50M+', '$25M-$49M', '$10M-$24M', '$5M-$9M', '$2M-$4M', '$1M-$1.9M', '<$1M',
      -- Builder ranges
      '$100M+', '$50M-$99M', '$25M-$49M', '$10M-$24M', '$5M-$9M', '$2M-$4M', '<$2M',
      -- Legacy ranges (for backward compatibility)
      '$10M+', '$6M-$10M', '$3M-$5.9M', '$1M-$2.9M', '$500K-$999K', '<$500K'
    )
  );