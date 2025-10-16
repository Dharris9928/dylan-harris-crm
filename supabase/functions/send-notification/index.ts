import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationPayload {
  notification_id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  link_url?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: NotificationPayload = await req.json();
    const { notification_id, user_id, type, title, message, link_url } = payload;

    // Get user preferences
    const { data: preferences, error: prefError } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", user_id)
      .single();

    if (prefError) {
      console.error("Error fetching preferences:", prefError);
      throw prefError;
    }

    // Check if email notifications are enabled for this type
    const shouldSendEmail = preferences.delivery_method === "email" || preferences.delivery_method === "both";
    
    let emailEnabled = false;
    switch (type) {
      case "access_request":
        emailEnabled = preferences.access_requests;
        break;
      case "access_approved":
      case "access_denied":
        emailEnabled = preferences.access_status;
        break;
      case "access_expiring":
        emailEnabled = preferences.access_expiring;
        break;
      case "access_revoked":
        emailEnabled = preferences.access_revoked;
        break;
      case "communication_view_request":
        emailEnabled = preferences.communication_requests;
        break;
      case "appeal_submitted":
        emailEnabled = preferences.appeal_submitted;
        break;
      default:
        emailEnabled = true; // Default to enabled for unknown types
    }

    if (!shouldSendEmail || !emailEnabled) {
      console.log(`Email notification skipped for user ${user_id}, type ${type}`);
      return new Response(
        JSON.stringify({ message: "Notification created (email skipped based on preferences)" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user email
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(user_id);
    if (userError || !userData.user) {
      throw new Error("User not found");
    }

    const userEmail = userData.user.email;
    if (!userEmail) {
      throw new Error("User email not found");
    }

    // Send email via Resend
    if (RESEND_API_KEY) {
      const emailHtml = `
        <h2>${title}</h2>
        <p>${message}</p>
        ${link_url ? `<p><a href="${link_url}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">View Details</a></p>` : ''}
        <hr />
        <p style="color: #666; font-size: 12px;">You received this email because you have notifications enabled in your account settings.</p>
      `;

      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "notifications@yourdomain.com", // Update with your verified domain
          to: [userEmail],
          subject: title,
          html: emailHtml,
        }),
      });

      if (!resendResponse.ok) {
        const error = await resendResponse.text();
        console.error("Resend API error:", error);
        throw new Error(`Failed to send email: ${error}`);
      }

      console.log(`Email sent to ${userEmail} for notification ${notification_id}`);
    } else {
      console.log("RESEND_API_KEY not configured, skipping email send");
    }

    return new Response(
      JSON.stringify({ message: "Notification sent successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending notification:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
