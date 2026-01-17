import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MAX_OTP_ATTEMPTS = 5;
const TOTP_PERIOD = 30;

// Base32 decode for TOTP
function base32Decode(encoded: string): Uint8Array {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const cleanEncoded = encoded.toUpperCase().replace(/=+$/, "");
  
  let bits = "";
  for (const char of cleanEncoded) {
    const val = alphabet.indexOf(char);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, "0");
  }
  
  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.slice(i * 8, (i + 1) * 8), 2);
  }
  
  return bytes;
}

async function hmacSha1(key: Uint8Array, message: Uint8Array): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key.buffer as ArrayBuffer,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  return crypto.subtle.sign("HMAC", cryptoKey, message.buffer as ArrayBuffer);
}

async function generateTOTP(secret: string, timeStep: number = 0): Promise<string> {
  const key = base32Decode(secret);
  const time = Math.floor(Date.now() / 1000 / TOTP_PERIOD) + timeStep;
  
  const timeBytes = new Uint8Array(8);
  const dataView = new DataView(timeBytes.buffer);
  dataView.setBigUint64(0, BigInt(time));
  
  const hmac = await hmacSha1(key, timeBytes);
  const hmacArray = new Uint8Array(hmac);
  
  const offset = hmacArray[hmacArray.length - 1] & 0x0f;
  const code = 
    ((hmacArray[offset] & 0x7f) << 24) |
    ((hmacArray[offset + 1] & 0xff) << 16) |
    ((hmacArray[offset + 2] & 0xff) << 8) |
    (hmacArray[offset + 3] & 0xff);
  
  return (code % 1000000).toString().padStart(6, "0");
}

async function verifyTOTP(secret: string, providedCode: string): Promise<boolean> {
  // Check current and adjacent time windows
  for (let i = -1; i <= 1; i++) {
    const expectedCode = await generateTOTP(secret, i);
    if (providedCode === expectedCode) {
      return true;
    }
  }
  return false;
}

function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 12) {
    return { valid: false, error: "Le mot de passe doit contenir au moins 12 caractères." };
  }

  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\;'/`~]/.test(password);

  const complexityCount = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar].filter(Boolean).length;

  if (complexityCount < 3) {
    return {
      valid: false,
      error: "Le mot de passe doit contenir au moins 3 des éléments suivants: majuscules, minuscules, chiffres, caractères spéciaux.",
    };
  }

  return { valid: true };
}

interface ChangePasswordRequest {
  newPassword: string;
  verificationCode: string;
  verificationType: "otp" | "totp";
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { newPassword, verificationCode, verificationType }: ChangePasswordRequest = await req.json();

    // Validate password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return new Response(
        JSON.stringify({ error: passwordValidation.error }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get user security settings
    const { data: securitySettings, error: settingsError } = await adminClient
      .from("user_security_settings")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (settingsError || !securitySettings) {
      return new Response(
        JSON.stringify({ error: "Paramètres de sécurité introuvables" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if account is locked
    if (securitySettings.locked_until && new Date(securitySettings.locked_until) > new Date()) {
      const unlockTime = new Date(securitySettings.locked_until);
      return new Response(
        JSON.stringify({ 
          error: `Compte temporairement bloqué. Réessayez après ${unlockTime.toLocaleTimeString("fr-FR")}.` 
        }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    let verified = false;

    if (verificationType === "totp") {
      // Verify TOTP
      if (!securitySettings.mfa_secret) {
        return new Response(
          JSON.stringify({ error: "TOTP non configuré pour ce compte" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      verified = await verifyTOTP(securitySettings.mfa_secret, verificationCode);
    } else {
      // Verify OTP from email
      if (!securitySettings.otp_code || !securitySettings.otp_expires_at) {
        return new Response(
          JSON.stringify({ error: "Aucun code OTP trouvé. Demandez un nouveau code." }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Check if OTP is expired
      if (new Date(securitySettings.otp_expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ error: "Le code a expiré. Demandez un nouveau code." }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Check attempts
      const attempts = (securitySettings.otp_attempts || 0) + 1;
      if (attempts > MAX_OTP_ATTEMPTS) {
        // Lock account for 15 minutes
        await adminClient
          .from("user_security_settings")
          .update({
            locked_until: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
            otp_code: null,
            otp_expires_at: null,
            otp_attempts: 0,
          })
          .eq("user_id", user.id);

        return new Response(
          JSON.stringify({ error: "Trop de tentatives. Compte bloqué pendant 15 minutes." }),
          { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Update attempts count
      await adminClient
        .from("user_security_settings")
        .update({ otp_attempts: attempts })
        .eq("user_id", user.id);

      verified = securitySettings.otp_code === verificationCode;
    }

    if (!verified) {
      // Log failed attempt
      await adminClient.rpc("log_security_event", {
        p_user_id: user.id,
        p_event_type: "login_failure",
        p_severity: "medium",
        p_details: { reason: "password_change_verification_failed", type: verificationType },
      });

      return new Response(
        JSON.stringify({ error: "Code de vérification invalide" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Code verified - change password
    const { error: passwordError } = await adminClient.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (passwordError) {
      console.error("Password update error:", passwordError);
      return new Response(
        JSON.stringify({ error: "Impossible de changer le mot de passe" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Update security settings
    await adminClient
      .from("user_security_settings")
      .update({
        otp_code: null,
        otp_expires_at: null,
        otp_attempts: 0,
        password_changed_at: new Date().toISOString(),
        password_must_change: false,
        locked_until: null,
      })
      .eq("user_id", user.id);

    // Log success
    await adminClient.rpc("log_security_event", {
      p_user_id: user.id,
      p_event_type: "password_change",
      p_severity: "low",
      p_details: { verification_type: verificationType },
    });

    console.log(`Password changed successfully for user ${user.id}`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in change-password:", error);
    return new Response(
      JSON.stringify({ error: "Une erreur s'est produite" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
