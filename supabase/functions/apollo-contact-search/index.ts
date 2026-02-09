import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { checkRateLimit } from '../_shared/rateLimiting.ts';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const requestSchema = z.object({
  companyId: z.string().uuid('Invalid company ID format').optional(),
  companyName: z.string().min(1, 'Company name is required').max(200),
  companyDomain: z.string().max(255).optional()
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apolloApiKey = Deno.env.get('APOLLO_API_KEY');
    if (!apolloApiKey) {
      throw new Error('Apollo API key not configured');
    }

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Check rate limit
    const rateLimitResponse = await checkRateLimit(supabase, user.id, 'apollo-contact-search');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Parse and validate request body
    const body = await req.json();
    const validation = requestSchema.safeParse(body);
    
    if (!validation.success) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input parameters',
          details: validation.error.format()
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { companyId, companyName, companyDomain } = validation.data;

    console.log(`Searching Apollo for contacts at: ${companyName}`);

    // Search Apollo.io for contacts
    const apolloResponse = await fetch('https://api.apollo.io/v1/mixed_people/api_search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Api-Key': apolloApiKey
      },
      body: JSON.stringify({
        api_key: apolloApiKey,
        q_organization_name: companyName,
        organization_domains: companyDomain ? [companyDomain] : undefined,
        person_titles: [
          'CEO', 'President', 'Owner', 'Founder',
          'VP', 'Director', 'Manager',
          'Chief Technology Officer', 'CTO',
          'Chief Operating Officer', 'COO'
        ],
        page: 1,
        per_page: 10
      })
    });

    if (!apolloResponse.ok) {
      const errorText = await apolloResponse.text();
      console.error('Apollo API error:', errorText);
      throw new Error(`Apollo API error: ${apolloResponse.status} ${errorText}`);
    }

    const apolloData = await apolloResponse.json();
    console.log(`Found ${apolloData.people?.length || 0} contacts`);

    // Transform Apollo data to our format
    const contacts = apolloData.people?.map((person: any) => ({
      firstName: person.first_name,
      lastName: person.last_name,
      title: person.title,
      email: person.email,
      phone: person.phone_numbers?.[0]?.raw_number || null,
      linkedinUrl: person.linkedin_url,
      decisionTier: determineDecisionTier(person.title || ''),
      source: 'apollo',
      apolloId: person.id,
      photoUrl: person.photo_url
    })) || [];

    return new Response(
      JSON.stringify({ 
        success: true,
        contacts,
        totalResults: apolloData.pagination?.total_entries || 0
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    // Log detailed error server-side only
    console.error('Apollo contact search error:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    // Return generic error to client
    return new Response(
      JSON.stringify({ error: 'Contact search failed. Please try again or contact support.' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function determineDecisionTier(title: string): 'Primary' | 'Secondary' | 'Influencer' {
  const titleLower = title.toLowerCase();
  
  const primaryTitles = ['ceo', 'president', 'owner', 'founder', 'chief executive'];
  const secondaryTitles = ['vp', 'vice president', 'director', 'cto', 'coo', 'cfo', 'chief'];
  
  if (primaryTitles.some(t => titleLower.includes(t))) {
    return 'Primary';
  } else if (secondaryTitles.some(t => titleLower.includes(t))) {
    return 'Secondary';
  } else {
    return 'Influencer';
  }
}
