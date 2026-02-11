import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as encodeBase32 } from "https://deno.land/std@0.190.0/encoding/base32.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate a cryptographically secure TOTP secret (20 bytes = 160 bits)
function generateTOTPSecret(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return encodeBase32(bytes).replace(/=/g, ""); // Remove padding
}

// Generate TOTP URI for authenticator apps
function generateTOTPUri(secret: string, email: string, issuer: string = "CNAM"): string {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedEmail = encodeURIComponent(email);
  return `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}

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
    const userEmail = claimsData.claims.email as string;

    // Use service role for database operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // TOTP is now required for ALL roles - no admin check needed

    // Check existing security settings
    const { data: existingSettings } = await supabaseAdmin
      .from("user_security_settings")
      .select("mfa_secret, mfa_status")
      .eq("user_id", userId)
      .single();

    // If already has TOTP set up and enabled, return that info
    if (existingSettings?.mfa_secret && existingSettings?.mfa_status === "enabled") {
      return new Response(
        JSON.stringify({
          success: true,
          already_enrolled: true,
          message: "TOTP déjà configuré",
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // If setup already started (pending) re-use the same secret
    if (existingSettings?.mfa_secret && existingSettings?.mfa_status === "pending") {
      const totpUri = generateTOTPUri(existingSettings.mfa_secret, userEmail);
      return new Response(
        JSON.stringify({
          success: true,
          secret: existingSettings.mfa_secret,
          totp_uri: totpUri,
          email: userEmail,
          message: "Scannez le QR code avec Microsoft Authenticator",
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate new TOTP secret
    const secret = generateTOTPSecret();
    const totpUri = generateTOTPUri(secret, userEmail);

    // Store secret temporarily (pending verification)
    const { error: upsertError } = await supabaseAdmin
      .from("user_security_settings")
      .upsert({
        user_id: userId,
        mfa_secret: secret,
        mfa_status: "pending",
        otp_attempts: 0,
      }, { onConflict: "user_id" });

    if (upsertError) {
      console.error("Error saving TOTP secret:", upsertError);
      return new Response(
        JSON.stringify({ error: "Erreur lors de la configuration" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Log security event
    await supabaseAdmin.rpc("log_security_event", {
      p_user_id: userId,
      p_event_type: "mfa_enabled",
      p_severity: "low",
      p_details: { action: "totp_setup_initiated", email: userEmail },
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        secret: secret,
        totp_uri: totpUri,
        email: userEmail,
        message: "Scannez le QR code avec Microsoft Authenticator"
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in setup-totp:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
