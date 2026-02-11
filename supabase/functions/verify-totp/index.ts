import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decode as decodeBase32 } from "https://deno.land/std@0.190.0/encoding/base32.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_ATTEMPTS = 5;
const TOTP_PERIOD = 30; // seconds
const TOTP_DIGITS = 6;

// HMAC-SHA1 implementation for TOTP
async function hmacSha1(key: ArrayBuffer, message: ArrayBuffer): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  return await crypto.subtle.sign("HMAC", cryptoKey, message);
}

// Generate TOTP code from secret
async function generateTOTP(secret: string, timeStep: number = 0): Promise<string> {
  // Pad secret to be valid base32
  const paddedSecret = secret.toUpperCase() + "======".slice(0, (8 - (secret.length % 8)) % 8);
  
  // Decode base32 secret
  const secretBytes = decodeBase32(paddedSecret);
  
  // Get current time counter
  const counter = Math.floor(Date.now() / 1000 / TOTP_PERIOD) + timeStep;
  
  // Convert counter to 8-byte big-endian buffer
  const counterBuffer = new ArrayBuffer(8);
  const counterView = new DataView(counterBuffer);
  counterView.setUint32(0, Math.floor(counter / 0x100000000), false);
  counterView.setUint32(4, counter >>> 0, false);
  
  // Copy Uint8Array to ArrayBuffer to satisfy TypeScript
  const keyBuffer = new ArrayBuffer(secretBytes.byteLength);
  new Uint8Array(keyBuffer).set(secretBytes);
  
  // Generate HMAC
  const hmacResult = await hmacSha1(keyBuffer, counterBuffer);
  const hmac = new Uint8Array(hmacResult);
  
  // Dynamic truncation
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = (
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  ) % Math.pow(10, TOTP_DIGITS);
  
  return code.toString().padStart(TOTP_DIGITS, "0");
}

// Verify TOTP with time window tolerance (allows ±2 time steps for clock skew)
async function verifyTOTP(secret: string, providedCode: string): Promise<boolean> {
  console.log("Verifying TOTP code, checking time windows -2 to +2");
  
  for (let timeStep = -2; timeStep <= 2; timeStep++) {
    try {
      const expectedCode = await generateTOTP(secret, timeStep);
      console.log(`Time step ${timeStep}: expected=${expectedCode}, provided=${providedCode}`);
      if (expectedCode === providedCode) {
        console.log(`TOTP matched at time step ${timeStep}`);
        return true;
      }
    } catch (e) {
      console.error("Error generating TOTP:", e);
    }
  }
  console.log("TOTP verification failed - no match in any time window");
  return false;
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

    const { code, is_setup } = await req.json();

    if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
      return new Response(
        JSON.stringify({ error: "Code invalide. Entrez les 6 chiffres de votre application." }),
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

    if (settingsError || !settings || !settings.mfa_secret) {
      return new Response(
        JSON.stringify({ error: "TOTP non configuré. Veuillez d'abord configurer l'authentification." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check attempt limit
    if (settings.otp_attempts >= MAX_ATTEMPTS) {
      // Check if locked
      if (settings.locked_until && new Date(settings.locked_until) > new Date()) {
        const remainingMinutes = Math.ceil((new Date(settings.locked_until).getTime() - Date.now()) / 60000);
        return new Response(
          JSON.stringify({ 
            error: `Compte temporairement bloqué. Réessayez dans ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}.` 
          }),
          { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Log excessive attempts
      await supabaseAdmin.rpc("log_security_event", {
        p_user_id: userId,
        p_event_type: "access_denied",
        p_severity: "high",
        p_details: { reason: "max_totp_attempts_exceeded" },
      });

      // Lock account for 15 minutes
      await supabaseAdmin
        .from("user_security_settings")
        .update({ 
          locked_until: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          otp_attempts: 0 
        })
        .eq("user_id", userId);

      return new Response(
        JSON.stringify({ error: "Trop de tentatives. Compte bloqué pour 15 minutes." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify TOTP code
    const isValid = await verifyTOTP(settings.mfa_secret, code);

    if (!isValid) {
      // Increment attempts
      await supabaseAdmin
        .from("user_security_settings")
        .update({ otp_attempts: (settings.otp_attempts || 0) + 1 })
        .eq("user_id", userId);

      // Log failed attempt
      await supabaseAdmin.rpc("log_security_event", {
        p_user_id: userId,
        p_event_type: "login_failure",
        p_severity: "medium",
        p_details: { reason: "invalid_totp", attempts: (settings.otp_attempts || 0) + 1 },
      });

      // Return 200 for expected failures to avoid FunctionsHttpError on the client
      return new Response(
        JSON.stringify({
          success: false,
          error: "Code incorrect. Vérifiez votre application d'authentification.",
          remainingAttempts: MAX_ATTEMPTS - ((settings.otp_attempts || 0) + 1),
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // TOTP verified successfully
    const updateData: Record<string, unknown> = {
      otp_attempts: 0,
      locked_until: null,
      last_login_at: new Date().toISOString(),
    };

    // If this is initial setup verification, mark as enabled
    if (is_setup || settings.mfa_status === "pending") {
      updateData.mfa_status = "enabled";
      updateData.mfa_enabled_at = new Date().toISOString();
    }

    await supabaseAdmin
      .from("user_security_settings")
      .update(updateData)
      .eq("user_id", userId);

    // Log success
    await supabaseAdmin.rpc("log_security_event", {
      p_user_id: userId,
      p_event_type: "login_success",
      p_severity: "low",
      p_details: { method: "totp_authenticator", is_setup: is_setup || false },
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: is_setup ? "Authentification à deux facteurs activée avec succès" : "Vérification réussie" 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: unknown) {
    console.error("Error in verify-totp:", error);
    return new Response(
      JSON.stringify({ error: "Une erreur s'est produite. Veuillez réessayer." }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
