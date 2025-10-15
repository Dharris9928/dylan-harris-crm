import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAdmin } from "../_shared/authorization.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin access and get authenticated user
    const { supabase } = await requireAdmin(req);

    const { userId, email, password, firstName, lastName } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Missing userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Updating user:', userId);

    // Update auth data (email/password) if provided
    const authUpdates: { email?: string; password?: string } = {};
    if (email) authUpdates.email = email;
    if (password) {
      if (password.length < 8 || password.length > 20) {
        return new Response(
          JSON.stringify({ error: 'Password must be 8-20 characters' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      authUpdates.password = password;
    }

    if (Object.keys(authUpdates).length > 0) {
      const { error: updateAuthError } = await supabase.auth.admin.updateUserById(
        userId,
        authUpdates
      );

      if (updateAuthError) {
        console.error('Auth update error:', updateAuthError);
        return new Response(
          JSON.stringify({ error: updateAuthError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Update profile data (name) if provided
    if (firstName !== undefined || lastName !== undefined) {
      const profileUpdates: { first_name?: string; last_name?: string } = {};
      if (firstName !== undefined) profileUpdates.first_name = firstName;
      if (lastName !== undefined) profileUpdates.last_name = lastName;

      const { error: profileError } = await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('id', userId);

      if (profileError) {
        console.error('Profile update error:', profileError);
        return new Response(
          JSON.stringify({ error: profileError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log('User updated successfully:', userId);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'User updated successfully'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});