import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { corsHeaders } from '../_shared/cors.ts';

// Import the contractor scoring logic
async function calculateContractorScore(supabase: any, companyId: string) {
  // Fetch company data with contacts
  const { data: company, error } = await supabase
    .from('companies')
    .select(`
      *,
      contacts:contacts(id, title, linkedin_url, linkedin_connections, job_role_category, role_score)
    `)
    .eq('id', companyId)
    .single();

  if (error || !company) {
    throw new Error(`Company not found: ${companyId}`);
  }

  if (company.industry_type !== 'Contractor') {
    throw new Error('Company is not a Contractor');
  }

  // Initialize scoring breakdown
  const scoring = {
    volumeScore: 0,
    revenueScore: 0,
    businessModelScore: 0,
    geographicScore: 0,
    stabilityScore: 0,
    firmographicTotal: 0,
    websiteQualityScore: 0,
    linkedinActivityScore: 0,
    technologyAdoptionScore: 0,
    digitalTotal: 0,
    decisionAuthorityScore: 0,
    linkedinProfessionalScore: 0,
    contactTotal: 0,
    totalScore: 0,
    priorityTier: 'Unscored',
    confidence: 'Low'
  };

  // Helper function to get score from configuration
  async function getScoreForRange(fieldName: string, rangeValue: string) {
    if (!rangeValue) return 0;

    // Try exact industry match first
    const { data, error } = await supabase
      .from('scoring_configuration')
      .select('score_points')
      .eq('field_name', fieldName)
      .eq('range_value', rangeValue)
      .eq('industry_type', 'Contractor')
      .maybeSingle();

    if (error || !data) {
      // Try 'Both' industries
      const { data: bothData } = await supabase
        .from('scoring_configuration')
        .select('score_points')
        .eq('field_name', fieldName)
        .eq('range_value', rangeValue)
        .eq('industry_type', 'Both')
        .maybeSingle();

      return bothData?.score_points || 0;
    }

    return data.score_points;
  }

  // Helper function for geographic scoring
  function calculateGeographicScore(state: string) {
    const highValueStates = ['CA', 'TX', 'FL', 'NY', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI'];
    const mediumValueStates = ['NJ', 'VA', 'WA', 'MA', 'AZ', 'IN', 'TN', 'MO', 'MD', 'WI'];
    
    if (!state) return 0;
    if (highValueStates.includes(state)) return 10;
    if (mediumValueStates.includes(state)) return 7;
    return 4;
  }

  // Helper function to assign priority tier
  function assignPriorityTier(score: number) {
    if (score >= 80) return 'P1';
    if (score >= 60) return 'P2';
    if (score >= 40) return 'P3';
    return 'Unscored';
  }

  // FIRMOGRAPHIC SCORING (50 points)
  if (company.annual_volume_range) {
    scoring.volumeScore = await getScoreForRange('annual_volume_range', company.annual_volume_range);
  }

  if (company.annual_revenue_range) {
    scoring.revenueScore = await getScoreForRange('annual_revenue_range', company.annual_revenue_range);
  }

  // Business Model Score (0-8 points)
  let businessModelScore = 0;
  if (company.maintenance_contract_percentage !== null) {
    if (company.maintenance_contract_percentage >= 80) businessModelScore += 5;
    else if (company.maintenance_contract_percentage >= 60) businessModelScore += 4;
    else if (company.maintenance_contract_percentage >= 40) businessModelScore += 3;
    else if (company.maintenance_contract_percentage >= 20) businessModelScore += 2;
    else if (company.maintenance_contract_percentage >= 10) businessModelScore += 1;
  }
  
  if (company.emergency_service_percentage !== null) {
    if (company.emergency_service_percentage < 20) businessModelScore += 3;
    else if (company.emergency_service_percentage < 40) businessModelScore += 2;
    else if (company.emergency_service_percentage < 60) businessModelScore += 1;
  }
  scoring.businessModelScore = Math.min(businessModelScore, 8);

  scoring.geographicScore = calculateGeographicScore(company.state);

  // Stability Score (0-8 points)
  let stabilityScore = 0;
  if (company.total_employees_range) {
    stabilityScore += await getScoreForRange('total_employees_range', company.total_employees_range);
  }
  if (company.years_in_business_range) {
    stabilityScore += await getScoreForRange('years_in_business_range', company.years_in_business_range);
  }
  scoring.stabilityScore = Math.min(stabilityScore, 8);

  scoring.firmographicTotal = 
    scoring.volumeScore +
    scoring.revenueScore +
    scoring.businessModelScore +
    scoring.geographicScore +
    scoring.stabilityScore;

  // DIGITAL ENGAGEMENT (30 points)
  if (company.website_quality) {
    scoring.websiteQualityScore = await getScoreForRange('website_quality', company.website_quality);
  }

  if (company.linkedin_activity_level) {
    scoring.linkedinActivityScore = await getScoreForRange('linkedin_activity_level', company.linkedin_activity_level);
  }

  let techScore = 0;
  if (company.technology_adoption_level) {
    techScore = await getScoreForRange('technology_adoption_level', company.technology_adoption_level);
  } else if (company.nest_installation_volume_range) {
    techScore = await getScoreForRange('nest_installation_volume_range', company.nest_installation_volume_range);
  }
  scoring.technologyAdoptionScore = Math.min(techScore, 10);

  scoring.digitalTotal = 
    scoring.websiteQualityScore +
    scoring.linkedinActivityScore +
    scoring.technologyAdoptionScore;

  // CONTACT QUALITY (20 points)
  let maxRoleScore = 0;
  let maxLinkedInScore = 0;
  
  if (company.contacts && company.contacts.length > 0) {
    company.contacts.forEach((contact: any) => {
      if (contact.role_score) {
        maxRoleScore = Math.max(maxRoleScore, contact.role_score);
      }
      
      let contactLinkedInScore = 0;
      if (contact.linkedin_url) contactLinkedInScore += 3;
      if (contact.linkedin_connections >= 1000) contactLinkedInScore += 4;
      else if (contact.linkedin_connections >= 500) contactLinkedInScore += 3;
      else if (contact.linkedin_connections >= 250) contactLinkedInScore += 2;
      else if (contact.linkedin_connections >= 100) contactLinkedInScore += 1;
      
      maxLinkedInScore = Math.max(maxLinkedInScore, contactLinkedInScore);
    });
  }
  
  scoring.decisionAuthorityScore = maxRoleScore;
  scoring.linkedinProfessionalScore = Math.min(maxLinkedInScore, 10);
  
  scoring.contactTotal = 
    scoring.decisionAuthorityScore +
    scoring.linkedinProfessionalScore;

  // TOTAL SCORE
  scoring.totalScore = 
    scoring.firmographicTotal +
    scoring.digitalTotal +
    scoring.contactTotal;

  scoring.priorityTier = assignPriorityTier(scoring.totalScore);

  // Calculate confidence
  const fieldsPopulated = [
    company.annual_volume_range,
    company.annual_revenue_range,
    company.total_employees_range,
    company.years_in_business_range,
    company.state,
    company.website_quality,
    company.linkedin_activity_level,
    company.technology_adoption_level,
    company.contacts?.length > 0
  ].filter(Boolean).length;

  if (fieldsPopulated >= 7) scoring.confidence = 'High';
  else if (fieldsPopulated >= 4) scoring.confidence = 'Medium';
  else scoring.confidence = 'Low';

  // Save to database
  await supabase
    .from('contractor_scoring_details')
    .upsert({
      company_id: companyId,
      volume_score: scoring.volumeScore,
      revenue_score: scoring.revenueScore,
      business_model_score: scoring.businessModelScore,
      geographic_score: scoring.geographicScore,
      stability_score: scoring.stabilityScore,
      firmographic_total: scoring.firmographicTotal,
      website_quality_score: scoring.websiteQualityScore,
      social_media_score: scoring.linkedinActivityScore,
      technology_adoption_score: scoring.technologyAdoptionScore,
      digital_total: scoring.digitalTotal,
      decision_authority_score: scoring.decisionAuthorityScore,
      linkedin_professional_score: scoring.linkedinProfessionalScore,
      contact_total: scoring.contactTotal,
      total_score: scoring.totalScore,
      calculated_at: new Date().toISOString()
    });

  // Update company record
  await supabase
    .from('companies')
    .update({
      lead_score: scoring.totalScore,
      priority_tier: scoring.priorityTier,
      segment_confidence: scoring.confidence,
      score_calculated_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', companyId);

  return scoring;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Verify the user is authenticated and has admin access
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has elevated access using secure RPC function
    const { data: hasAccess, error: accessError } = await supabaseClient
      .rpc('has_elevated_access', { _user_id: user.id });

    if (accessError || !hasAccess) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions. Admin or Sales Manager role required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching all contractors...');
    
    const { data: contractors, error } = await supabaseClient
      .from('companies')
      .select('id, company_name')
      .eq('industry_type', 'Contractor');

    if (error) {
      throw new Error(`Error fetching contractors: ${error.message}`);
    }

    console.log(`Found ${contractors.length} contractors to recalculate`);

    const results = {
      total: contractors.length,
      success: 0,
      errors: 0,
      details: [] as any[]
    };

    for (const contractor of contractors) {
      try {
        console.log(`Recalculating ${contractor.company_name}...`);
        const scoring = await calculateContractorScore(supabaseClient, contractor.id);
        results.success++;
        results.details.push({
          id: contractor.id,
          name: contractor.company_name,
          score: scoring.totalScore,
          tier: scoring.priorityTier,
          status: 'success'
        });
      } catch (error: any) {
        console.error(`Error calculating score for ${contractor.company_name}:`, error);
        results.errors++;
        results.details.push({
          id: contractor.id,
          name: contractor.company_name,
          error: error.message,
          status: 'error'
        });
      }
    }

    console.log('\n=== RECALCULATION COMPLETE ===');
    console.log(`Success: ${results.success}`);
    console.log(`Errors: ${results.errors}`);
    console.log(`Total: ${results.total}`);

    return new Response(
      JSON.stringify(results),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Error in recalculate-contractor-scores function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
