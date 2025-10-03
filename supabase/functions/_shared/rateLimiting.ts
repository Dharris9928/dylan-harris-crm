import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Check rate limit for a user on a specific endpoint
 * Returns null if allowed, or an error Response if rate limited
 */
export async function checkRateLimit(
  supabase: any, // Using any to avoid type conflicts across different Supabase client versions
  userId: string,
  endpoint: string
): Promise<Response | null> {
  try {
    const { data, error } = await supabase.rpc('check_rate_limit', {
      _user_id: userId,
      _endpoint: endpoint,
      _window_minutes: 1 // Check per-minute limit
    });

    if (error) {
      console.error('Rate limit check error:', error);
      // Allow request on error to avoid blocking legitimate traffic
      return null;
    }

    const result = data as any;
    
    if (!result.allowed) {
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded',
          message: `You have exceeded the rate limit. Current: ${result.current_count}/${result.limit} requests per ${result.window_minutes} minute(s).`,
          retryAfter: 60
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '60',
            'X-RateLimit-Limit': result.limit.toString(),
            'X-RateLimit-Remaining': Math.max(0, result.limit - result.current_count).toString(),
            'X-RateLimit-Reset': new Date(Date.now() + 60000).toISOString()
          }
        }
      );
    }

    // Request allowed
    return null;
  } catch (error) {
    console.error('Rate limiting error:', error);
    // Allow request on unexpected error
    return null;
  }
}
