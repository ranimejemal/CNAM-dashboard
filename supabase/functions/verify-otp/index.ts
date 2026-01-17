import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_ATTEMPTS = 5;

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { otp } = await req.json();

    if (!otp || otp.length !== 6) {
      return new Response(
        JSON.stringify({ error: "Code OTP invalide" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Token invalide" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userId = claimsData.claims.sub;

    // Use service role for security settings
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get user security settings
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from("user_security_settings")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (settingsError || !settings) {
      return new Response(
        JSON.stringify({ error: "Aucun code OTP en attente" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check attempts
    if (settings.otp_attempts >= MAX_ATTEMPTS) {
      // Log failed attempt
      await supabaseAdmin.rpc("log_security_event", {
        p_user_id: userId,
        p_event_type: "access_denied",
        p_severity: "high",
        p_details: { reason: "max_otp_attempts_exceeded" },
      });

      return new Response(
        JSON.stringify({ error: "Trop de tentatives. Veuillez demander un nouveau code." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check expiry
    if (new Date(settings.otp_expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Le code a expiré. Veuillez demander un nouveau code." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify OTP
    if (settings.otp_code !== otp) {
      // Increment attempts
      await supabaseAdmin
        .from("user_security_settings")
        .update({ otp_attempts: settings.otp_attempts + 1 })
        .eq("user_id", userId);

      // Log failed attempt
      await supabaseAdmin.rpc("log_security_event", {
        p_user_id: userId,
        p_event_type: "login_failure",
        p_severity: "medium",
        p_details: { reason: "invalid_otp", attempts: settings.otp_attempts + 1 },
      });

      return new Response(
        JSON.stringify({ 
          error: "Code incorrect", 
          remainingAttempts: MAX_ATTEMPTS - (settings.otp_attempts + 1) 
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // OTP verified successfully - update security settings
    await supabaseAdmin
      .from("user_security_settings")
      .update({
        otp_code: null,
        otp_expires_at: null,
        otp_attempts: 0,
        mfa_status: "enabled",
        mfa_enabled_at: new Date().toISOString(),
        last_login_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    // Log success
    await supabaseAdmin.rpc("log_security_event", {
      p_user_id: userId,
      p_event_type: "login_success",
      p_severity: "low",
      p_details: { method: "2fa_otp" },
    });

    return new Response(
      JSON.stringify({ success: true, message: "Vérification réussie" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in verify-otp:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
