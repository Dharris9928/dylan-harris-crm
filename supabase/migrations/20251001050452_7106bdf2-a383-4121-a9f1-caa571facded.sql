-- Fix the scoring for Hogan Homes company
UPDATE public.companies c
SET 
  lead_score = bsd.total_score,
  priority_tier = CASE 
    WHEN bsd.total_score >= 80 THEN 'P1'
    WHEN bsd.total_score >= 60 THEN 'P2'
    WHEN bsd.total_score >= 40 THEN 'P3'
    ELSE 'Unscored'
  END,
  segment_confidence = CASE 
    WHEN bsd.confidence LIKE 'High%' THEN 'High'
    WHEN bsd.confidence LIKE 'Medium%' THEN 'Medium'
    ELSE 'Low'
  END
FROM public.builder_scoring_details bsd
WHERE c.id = bsd.company_id
  AND c.id = 'b801f55c-573a-41da-b35c-b9e8130acff0';