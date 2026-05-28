// ============================================================
// Batch recalculation of v2.0 scores for ALL companies.
// Resumable chunked processing — client repeatedly invokes with
// the previous `nextCursor` until `nextCursor === null`.
// (Function name kept for backward-compatibility with the existing
// client button.)
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { corsHeaders } from '../_shared/cors.ts';
import { scoreCompanyV2 } from '../_shared/scoringV2.ts';

const DEFAULT_CHUNK = 500;
const MAX_CHUNK = 1000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Auth + elevated-access check
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: hasAccess } = await supabase.rpc('has_elevated_access', { _user_id: user.id });
    if (!hasAccess) {
      return new Response(JSON.stringify({ error: 'Admin or Sales Manager role required.' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parse chunk params
    let body: any = {};
    try { body = await req.json(); } catch { /* GET / empty body ok */ }
    const cursor: string | null = body.cursor ?? null;
    const limit: number = Math.min(MAX_CHUNK, Math.max(50, Number(body.limit) || DEFAULT_CHUNK));

    console.log(`[recalc-v2] chunk start — cursor=${cursor ?? 'INITIAL'} limit=${limit}`);

    const summary = {
      processed: 0, success: 0, errors: 0,
      by_channel: { Builder: 0, Contractor: 0, Other: 0 },
      by_tier: { P1: 0, P2: 0, P3: 0, Unscored: 0 },
      errored_companies: [] as { id: string; name: string; error: string }[],
    };

    // Keyset pagination by id (uuid sort is consistent)
    let query = supabase
      .from('companies')
      .select(`*, contacts:contacts(id, title)`)
      .order('id', { ascending: true })
      .limit(limit);
    if (cursor) query = query.gt('id', cursor);

    const { data: page, error: pageErr } = await query;
    if (pageErr) throw pageErr;

    let lastId: string | null = null;
    for (const company of page ?? []) {
      summary.processed++;
      lastId = company.id;
      try {
        const result = scoreCompanyV2(company);
        const channel: 'Builder' | 'Contractor' | 'Other' =
          company.industry_type === 'Builder' ? 'Builder' :
          company.industry_type === 'Contractor' ? 'Contractor' : 'Other';
        summary.by_channel[channel]++;
        summary.by_tier[result.priority_tier]++;

        const shortConfidence = result.confidence?.startsWith('High') ? 'High'
          : result.confidence?.startsWith('Medium') ? 'Medium'
          : result.confidence?.startsWith('Low') ? 'Low' : null;

        const { error: updErr } = await supabase
          .from('companies')
          .update({
            lead_score: Math.round(result.total_score),
            segment_confidence: shortConfidence,
            score_breakdown_v2: result as any,
            program_readiness_stage: (result as any).program_readiness_stage ?? null,
            score_calculated_at: new Date().toISOString(),
          } as any)
          .eq('id', company.id);
        if (updErr) throw updErr;
        summary.success++;
      } catch (e: any) {
        summary.errors++;
        if (summary.errored_companies.length < 50) {
          summary.errored_companies.push({
            id: company.id, name: company.company_name, error: String(e?.message ?? e),
          });
        }
        console.error(`[recalc-v2] failed for ${company.company_name}:`, e);
      }
    }

    const exhausted = (page?.length ?? 0) < limit;
    const nextCursor = exhausted ? null : lastId;

    console.log(`[recalc-v2] chunk done — processed=${summary.processed} success=${summary.success} errors=${summary.errors} nextCursor=${nextCursor ?? 'DONE'}`);

    return new Response(JSON.stringify({ ...summary, nextCursor }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('[recalc-v2] fatal:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
