import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { companyId, deepEnrich = false } = await req.json();

    if (!companyId) {
      return new Response(
        JSON.stringify({ error: 'companyId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user and get company
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check company access
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      return new Response(
        JSON.stringify({ error: 'Company not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting enrichment for company: ${company.company_name} (${companyId})`);

    let enrichmentResult;
    let provider = 'lovable_ai';
    let fallbackUsed = false;

    // Try Lovable AI (Gemini) first for standard enrichment
    if (!deepEnrich) {
      try {
        enrichmentResult = await enrichWithLovableAI(company);
        console.log('Lovable AI enrichment successful');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Lovable AI failed, falling back to Claude:', errorMessage);
        fallbackUsed = true;
      }
    }

    // Use Claude for deep enrichment or if Lovable AI failed
    if (deepEnrich || fallbackUsed) {
      provider = 'claude';
      try {
        enrichmentResult = await enrichWithClaude(company, deepEnrich);
        console.log('Claude enrichment successful');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Claude enrichment failed:', errorMessage);
        
        // Log failure
        await supabase.from('enrichment_logs').insert({
          company_id: companyId,
          provider,
          enrichment_type: deepEnrich ? 'deep' : 'standard',
          status: 'failed',
          error_message: errorMessage,
          created_by: user.id
        });

        return new Response(
          JSON.stringify({ error: 'Enrichment failed', details: errorMessage }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (!enrichmentResult) {
      return new Response(
        JSON.stringify({ error: 'No enrichment result' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update company with enriched data
    const { error: updateError } = await supabase
      .from('companies')
      .update(enrichmentResult.companyUpdates)
      .eq('id', companyId);

    if (updateError) {
      console.error('Failed to update company:', updateError);
    }

    // Upsert AI insights
    const { error: insightsError } = await supabase
      .from('company_ai_insights')
      .upsert({
        company_id: companyId,
        ...enrichmentResult.insights,
        enriched_by: user.id,
        last_enriched_at: new Date().toISOString()
      });

    if (insightsError) {
      console.error('Failed to save insights:', insightsError);
    }

    // Log successful enrichment
    await supabase.from('enrichment_logs').insert({
      company_id: companyId,
      provider,
      enrichment_type: deepEnrich ? 'deep' : 'standard',
      status: 'success',
      confidence_score: enrichmentResult.confidence,
      fields_enriched: enrichmentResult.fieldsEnriched,
      created_by: user.id
    });

    // Trigger score recalculation by updating company timestamp
    // This will cause client-side recalculation triggers to fire
    await supabase
      .from('companies')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', companyId);

    return new Response(
      JSON.stringify({
        success: true,
        provider,
        confidence: enrichmentResult.confidence,
        fieldsEnriched: enrichmentResult.fieldsEnriched,
        insights: enrichmentResult.insights,
        scoreRecalculationTriggered: true
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Enrichment error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function enrichWithLovableAI(company: any) {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  const prompt = `Analyze this company and provide enrichment data:
Company Name: ${company.company_name}
Industry: ${company.industry_type}
Website: ${company.website_url || 'Not provided'}
LinkedIn: ${company.linkedin_company_url || 'Not provided'}
Current Data: ${JSON.stringify(company, null, 2)}

Provide structured enrichment focusing on:
1. Missing firmographic data (employees, revenue, years in business)
2. Website quality assessment
3. LinkedIn activity level
4. Social media presence
5. Technology adoption indicators
6. Geographic market focus
7. Smart home readiness for HVAC/Construction industry`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'You are a B2B data enrichment specialist. Extract and structure company information accurately.' },
        { role: 'user', content: prompt }
      ],
      tools: [{
        type: 'function',
        function: {
          name: 'enrich_company_data',
          description: 'Structure enriched company data',
          parameters: {
            type: 'object',
            properties: {
              total_employees: { type: 'integer', description: 'Estimated number of employees' },
              annual_revenue_range: { type: 'string', enum: ['<$500K', '$500K-$1M', '$1M-$5M', '$5M-$10M', '$10M-$25M', '$25M+'] },
              years_in_business: { type: 'integer' },
              website_quality: { type: 'string', enum: ['Poor', 'Basic', 'Good', 'Professional', 'Excellent'] },
              linkedin_activity_level: { type: 'string', enum: ['None', 'Low', 'Medium', 'High'] },
              technology_adoption_level: { type: 'string', enum: ['Low', 'Medium', 'High', 'Very High'] },
              social_media_presence: { type: 'string', enum: ['None', 'Limited', 'Moderate', 'Active', 'Very Active'] },
              market_positioning: { type: 'string' },
              competitive_advantages: { type: 'array', items: { type: 'string' } },
              growth_indicators: { type: 'array', items: { type: 'string' } },
              smart_home_readiness_score: { type: 'integer', minimum: 0, maximum: 100 },
              confidence_level: { type: 'string', enum: ['high', 'medium', 'low'] }
            }
          }
        }
      }],
      tool_choice: { type: 'function', function: { name: 'enrich_company_data' } }
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Lovable AI error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const toolCall = data.choices[0]?.message?.tool_calls?.[0];
  
  if (!toolCall) {
    throw new Error('No structured data returned from Lovable AI');
  }

  const enrichedData = JSON.parse(toolCall.function.arguments);

  return {
    companyUpdates: {
      total_employees: enrichedData.total_employees,
      annual_revenue_range: enrichedData.annual_revenue_range,
      years_in_business: enrichedData.years_in_business,
      website_quality: enrichedData.website_quality,
      linkedin_activity_level: enrichedData.linkedin_activity_level,
      technology_adoption_level: enrichedData.technology_adoption_level,
      social_media_presence: enrichedData.social_media_presence
    },
    insights: {
      market_positioning: enrichedData.market_positioning,
      competitive_advantages: enrichedData.competitive_advantages,
      growth_indicators: enrichedData.growth_indicators,
      smart_home_readiness_score: enrichedData.smart_home_readiness_score,
      confidence_level: enrichedData.confidence_level
    },
    confidence: enrichedData.confidence_level === 'high' ? 85 : enrichedData.confidence_level === 'medium' ? 70 : 50,
    fieldsEnriched: Object.keys(enrichedData)
  };
}

async function enrichWithClaude(company: any, deepEnrich: boolean) {
  const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
  
  if (!ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }
  
  const prompt = deepEnrich
    ? `Perform DEEP analysis of this company with advanced reasoning:
Company: ${company.company_name}
Industry: ${company.industry_type}
Website: ${company.website_url || 'Not provided'}
LinkedIn: ${company.linkedin_company_url || 'Not provided'}

Deep analysis should include:
1. Executive team identification and decision-maker mapping
2. Recent company news, growth signals, and market positioning
3. Competitive landscape analysis
4. Smart home/technology adoption readiness specific to HVAC/Construction
5. Parent company relationships and corporate structure
6. Market trends affecting this company
7. Strategic partnership opportunities

Current data: ${JSON.stringify(company, null, 2)}`
    : `Analyze and enrich this company data:
Company: ${company.company_name}
Industry: ${company.industry_type}
Provide: employees, revenue, years in business, website quality, tech adoption, social presence.
Current data: ${JSON.stringify(company, null, 2)}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      tools: [{
        name: 'enrich_company_data',
        description: 'Structure enriched company data with deep insights',
        input_schema: {
          type: 'object',
          properties: {
            total_employees: { type: 'integer' },
            annual_revenue_range: { type: 'string', enum: ['<$500K', '$500K-$1M', '$1M-$5M', '$5M-$10M', '$10M-$25M', '$25M+'] },
            years_in_business: { type: 'integer' },
            website_quality: { type: 'string', enum: ['Poor', 'Basic', 'Good', 'Professional', 'Excellent'] },
            linkedin_activity_level: { type: 'string', enum: ['None', 'Low', 'Medium', 'High'] },
            technology_adoption_level: { type: 'string', enum: ['Low', 'Medium', 'High', 'Very High'] },
            social_media_presence: { type: 'string', enum: ['None', 'Limited', 'Moderate', 'Active', 'Very Active'] },
            market_positioning: { type: 'string' },
            competitive_advantages: { type: 'array', items: { type: 'string' } },
            growth_indicators: { type: 'array', items: { type: 'string' } },
            smart_home_readiness_score: { type: 'integer', minimum: 0, maximum: 100 },
            recommended_approach: { type: 'string' },
            confidence_level: { type: 'string', enum: ['high', 'medium', 'low'] }
          }
        }
      }],
      tool_choice: { type: 'tool', name: 'enrich_company_data' },
      messages: [{ role: 'user', content: prompt }]
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const toolUse = data.content.find((c: any) => c.type === 'tool_use');
  
  if (!toolUse) {
    throw new Error('No structured data returned from Claude');
  }

  const enrichedData = toolUse.input;

  return {
    companyUpdates: {
      total_employees: enrichedData.total_employees,
      annual_revenue_range: enrichedData.annual_revenue_range,
      years_in_business: enrichedData.years_in_business,
      website_quality: enrichedData.website_quality,
      linkedin_activity_level: enrichedData.linkedin_activity_level,
      technology_adoption_level: enrichedData.technology_adoption_level,
      social_media_presence: enrichedData.social_media_presence
    },
    insights: {
      market_positioning: enrichedData.market_positioning,
      competitive_advantages: enrichedData.competitive_advantages,
      growth_indicators: enrichedData.growth_indicators,
      smart_home_readiness_score: enrichedData.smart_home_readiness_score,
      recommended_approach: enrichedData.recommended_approach,
      confidence_level: enrichedData.confidence_level
    },
    confidence: enrichedData.confidence_level === 'high' ? 90 : enrichedData.confidence_level === 'medium' ? 75 : 55,
    fieldsEnriched: Object.keys(enrichedData)
  };
}
