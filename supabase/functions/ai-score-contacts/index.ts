import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit } from '../_shared/rateLimiting.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate user and check rate limit
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const { data: { user }, error: authError } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
      );

      if (!authError && user) {
        // Check rate limit
        const rateLimitResponse = await checkRateLimit(supabase, user.id, 'ai-score-contacts');
        if (rateLimitResponse) {
          return rateLimitResponse;
        }
      }
    }

    const { companyId, contacts } = await req.json();

    // Fetch company context
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('company_name, industry_type, segment, priority_tier, lead_score')
      .eq('id', companyId)
      .single();

    if (companyError) throw companyError;

    // Build AI prompt
    const systemPrompt = `You are an expert at evaluating sales contacts and decision makers. Score contacts based on:

1. Decision-making authority (title, role)
2. Accessibility (email, phone, LinkedIn availability)
3. Digital engagement (LinkedIn connections, activity)
4. Relevance to smart home/construction sales

Provide scores from 1-100 and clear reasoning.`;

    const contactsData = contacts.map((c: any) => ({
      id: c.apolloId || c.id,
      firstName: c.firstName || c.first_name,
      lastName: c.lastName || c.last_name,
      title: c.title,
      email: c.email,
      phone: c.phone,
      linkedinUrl: c.linkedinUrl || c.linkedin_url,
      decisionTier: c.decisionTier || c.decision_tier,
      linkedinConnections: c.linkedinConnections || c.linkedin_connections,
      photoUrl: c.photoUrl
    }));

    const userPrompt = `Score these contacts for ${company.company_name} (${company.industry_type} - ${company.segment}):\n\n${JSON.stringify(contactsData, null, 2)}\n\nFor each contact provide:\n1. Contact score (1-100)\n2. Key strengths\n3. Recommended approach\n4. Best time to reach out`;

    // Call Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'score_contacts',
            description: 'Score and rank contacts',
            parameters: {
              type: 'object',
              properties: {
                scoredContacts: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      contactId: { type: 'string' },
                      score: { type: 'number', minimum: 1, maximum: 100 },
                      strengths: { type: 'array', items: { type: 'string' } },
                      recommendedApproach: { type: 'string' },
                      bestTimeToReach: { type: 'string' },
                      priority: { type: 'string', enum: ['High', 'Medium', 'Low'] }
                    },
                    required: ['contactId', 'score', 'strengths', 'recommendedApproach', 'priority']
                  }
                }
              },
              required: ['scoredContacts']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'score_contacts' } }
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      throw new Error(`AI request failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error('No tool call returned from AI');
    }

    const scoredContacts = JSON.parse(toolCall.function.arguments).scoredContacts;

    return new Response(
      JSON.stringify({ scoredContacts }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-score-contacts:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});