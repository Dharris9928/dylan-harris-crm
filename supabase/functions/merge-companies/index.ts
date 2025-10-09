import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MergeRequest {
  source_company_id: string;
  target_company_id: string;
}

interface MergeStats {
  contacts: number;
  activities: number;
  branches: number;
  installations: number;
  partner_matches: number;
  ai_insights: number;
  scoring_details: number;
  communications: number;
  enrichment_logs: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Verify user is admin
    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || !roleData || roleData.role !== 'admin') {
      throw new Error('Admin access required');
    }

    const { source_company_id, target_company_id }: MergeRequest = await req.json();

    if (!source_company_id || !target_company_id) {
      throw new Error('Both source and target company IDs are required');
    }

    if (source_company_id === target_company_id) {
      throw new Error('Cannot merge a company with itself');
    }

    console.log(`Starting merge: ${source_company_id} -> ${target_company_id}`);

    // Verify both companies exist
    const { data: companies, error: companiesError } = await supabaseClient
      .from('companies')
      .select('id, company_name')
      .in('id', [source_company_id, target_company_id]);

    if (companiesError || !companies || companies.length !== 2) {
      throw new Error('One or both companies not found');
    }

    const sourceCompany = companies.find(c => c.id === source_company_id);
    const targetCompany = companies.find(c => c.id === target_company_id);

    console.log(`Merging: ${sourceCompany?.company_name} into ${targetCompany?.company_name}`);

    const stats: MergeStats = {
      contacts: 0,
      activities: 0,
      branches: 0,
      installations: 0,
      partner_matches: 0,
      ai_insights: 0,
      scoring_details: 0,
      communications: 0,
      enrichment_logs: 0,
    };

    // Update contacts
    const { data: contactsData, error: contactsError } = await supabaseClient
      .from('contacts')
      .update({ company_id: target_company_id })
      .eq('company_id', source_company_id)
      .select('id');

    if (contactsError) {
      console.error('Error updating contacts:', contactsError);
    } else {
      stats.contacts = contactsData?.length || 0;
      console.log(`Updated ${stats.contacts} contacts`);
    }

    // Update outreach activities
    const { data: activitiesData, error: activitiesError } = await supabaseClient
      .from('outreach_activities')
      .update({ company_id: target_company_id })
      .eq('company_id', source_company_id)
      .select('id');

    if (activitiesError) {
      console.error('Error updating activities:', activitiesError);
    } else {
      stats.activities = activitiesData?.length || 0;
      console.log(`Updated ${stats.activities} activities`);
    }

    // Update company branches
    const { data: branchesData, error: branchesError } = await supabaseClient
      .from('company_branches')
      .update({ company_id: target_company_id })
      .eq('company_id', source_company_id)
      .select('id');

    if (branchesError) {
      console.error('Error updating branches:', branchesError);
    } else {
      stats.branches = branchesData?.length || 0;
      console.log(`Updated ${stats.branches} branches`);
    }

    // Update installation history
    const { data: installationsData, error: installationsError } = await supabaseClient
      .from('installation_history')
      .update({ company_id: target_company_id })
      .eq('company_id', source_company_id)
      .select('id');

    if (installationsError) {
      console.error('Error updating installations:', installationsError);
    } else {
      stats.installations = installationsData?.length || 0;
      console.log(`Updated ${stats.installations} installations`);
    }

    // Update company partner matches
    const { data: partnerData, error: partnerError } = await supabaseClient
      .from('company_partner_matches')
      .update({ company_id: target_company_id })
      .eq('company_id', source_company_id)
      .select('id');

    if (partnerError) {
      console.error('Error updating partner matches:', partnerError);
    } else {
      stats.partner_matches = partnerData?.length || 0;
      console.log(`Updated ${stats.partner_matches} partner matches`);
    }

    // Update pilot programs
    await supabaseClient
      .from('pilot_programs')
      .update({ company_id: target_company_id })
      .eq('company_id', source_company_id);

    // Delete AI insights for source (will be regenerated if needed)
    const { data: aiInsightsData } = await supabaseClient
      .from('company_ai_insights')
      .delete()
      .eq('company_id', source_company_id)
      .select('id');

    stats.ai_insights = aiInsightsData?.length || 0;
    console.log(`Deleted ${stats.ai_insights} AI insights (will be regenerated)`);

    // Delete scoring details for source (will be recalculated)
    const { data: builderScoringData } = await supabaseClient
      .from('builder_scoring_details')
      .delete()
      .eq('company_id', source_company_id)
      .select('id');

    const { data: contractorScoringData } = await supabaseClient
      .from('contractor_scoring_details')
      .delete()
      .eq('company_id', source_company_id)
      .select('id');

    stats.scoring_details = (builderScoringData?.length || 0) + (contractorScoringData?.length || 0);
    console.log(`Deleted ${stats.scoring_details} scoring records (will be recalculated)`);

    // Update communications
    const { data: commsData, error: commsError } = await supabaseClient
      .from('company_communications')
      .update({ company_id: target_company_id })
      .eq('company_id', source_company_id)
      .select('id');

    if (commsError) {
      console.error('Error updating communications:', commsError);
    } else {
      stats.communications = commsData?.length || 0;
      console.log(`Updated ${stats.communications} communications`);
    }

    // Update enrichment logs
    const { data: enrichmentData, error: enrichmentError } = await supabaseClient
      .from('enrichment_logs')
      .update({ company_id: target_company_id })
      .eq('company_id', source_company_id)
      .select('id');

    if (enrichmentError) {
      console.error('Error updating enrichment logs:', enrichmentError);
    } else {
      stats.enrichment_logs = enrichmentData?.length || 0;
      console.log(`Updated ${stats.enrichment_logs} enrichment logs`);
    }

    // Delete the source company
    const { error: deleteError } = await supabaseClient
      .from('companies')
      .delete()
      .eq('id', source_company_id);

    if (deleteError) {
      console.error('Error deleting source company:', deleteError);
      throw new Error('Failed to delete source company after merge');
    }

    console.log('Source company deleted successfully');

    // Create audit log entry
    await supabaseClient.from('import_export_logs').insert({
      user_id: user.id,
      activity_type: 'COMPANY_MERGE',
      table_name: 'companies',
      record_count: 1,
      successful_count: 1,
      failed_count: 0,
      file_format: 'INTERNAL',
      filters_applied: {
        source_company_id,
        target_company_id,
        source_company_name: sourceCompany?.company_name,
        target_company_name: targetCompany?.company_name,
        merge_stats: stats,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Merged ${sourceCompany?.company_name} into ${targetCompany?.company_name}`,
        stats,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Merge companies error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
