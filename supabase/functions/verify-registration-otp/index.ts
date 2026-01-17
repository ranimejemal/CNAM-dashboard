import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_ATTEMPTS = 5;

interface VerifyRequest {
  email: string;
  otp_code: string;
  phone?: string;
  message?: string;
}

// HTML escape function to prevent HTML injection in emails
function escapeHtml(text: string | undefined | null): string {
  if (!text) return '';
  const map: {[key: string]: string} = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email, otp_code, phone, message }: VerifyRequest = await req.json();
    
    // Validate input
    if (!email || !otp_code) {
      return new Response(
        JSON.stringify({ error: "Données manquantes" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Sanitize OTP code
    const sanitizedOtp = otp_code.replace(/\D/g, '').substring(0, 6);
    if (sanitizedOtp.length !== 6) {
      return new Response(
        JSON.stringify({ error: "Code invalide" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get the OTP record
    const { data: otpRecord, error: fetchError } = await supabase
      .from("registration_otps")
      .select("*")
      .eq("email", email)
      .single();

    if (fetchError || !otpRecord) {
      return new Response(
        JSON.stringify({ error: "Aucun code trouvé pour cet email. Veuillez redemander un code." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if expired
    if (new Date(otpRecord.expires_at) < new Date()) {
      await supabase.from("registration_otps").delete().eq("email", email);
      return new Response(
        JSON.stringify({ error: "Code expiré. Veuillez redemander un nouveau code." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check attempts
    if (otpRecord.attempts >= MAX_ATTEMPTS) {
      await supabase.from("registration_otps").delete().eq("email", email);
      return new Response(
        JSON.stringify({ error: "Trop de tentatives. Veuillez redemander un nouveau code." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Increment attempts
    await supabase
      .from("registration_otps")
      .update({ attempts: otpRecord.attempts + 1 })
      .eq("email", email);

    // Verify OTP
    if (otpRecord.otp_code !== sanitizedOtp) {
      const remainingAttempts = MAX_ATTEMPTS - otpRecord.attempts - 1;
      return new Response(
        JSON.stringify({ 
          error: `Code incorrect. ${remainingAttempts} tentative(s) restante(s).` 
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // OTP verified - create registration request
    const { data: requestData, error: insertError } = await supabase
      .from("registration_requests")
      .insert({
        first_name: otpRecord.first_name,
        last_name: otpRecord.last_name,
        email: email,
        phone: phone || null,
        message: message || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating registration request:", insertError);
      if (insertError.code === "23505") {
        return new Response(
          JSON.stringify({ error: "Une demande avec cet email existe déjà" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      throw new Error("Erreur lors de la création de la demande");
    }

    // Clean up OTP record
    await supabase.from("registration_otps").delete().eq("email", email);

    // Notify admins
    await notifyAdmins(supabase, {
      id: requestData.id,
      first_name: otpRecord.first_name,
      last_name: otpRecord.last_name,
      email: email,
      phone: phone,
      message: message,
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email vérifié et demande soumise avec succès",
        request_id: requestData.id
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("Error in verify-registration-otp:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

async function notifyAdmins(supabase: any, requestData: any) {
  try {
    // Get all admin users
    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (!adminRoles || adminRoles.length === 0) return;

    const adminUserIds = adminRoles.map((r: any) => r.user_id);
    const { data: adminProfiles } = await supabase
      .from("profiles")
      .select("email")
      .in("user_id", adminUserIds);

    const adminEmails = adminProfiles?.map((p: any) => p.email).filter(Boolean) || [];
    if (adminEmails.length === 0) return;

    const appUrl = Deno.env.get("APP_URL") || "https://cnam-dashboard.lovable.app";
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    // Escape all user-provided data to prevent HTML injection
    const safeFirstName = escapeHtml(requestData.first_name);
    const safeLastName = escapeHtml(requestData.last_name);
    const safeEmail = escapeHtml(requestData.email);
    const safePhone = escapeHtml(requestData.phone);
    const safeMessage = escapeHtml(requestData.message);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .card { background: white; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 24px; }
          .header h1 { color: #16a34a; margin: 0; font-size: 24px; }
          .verified-badge { display: inline-block; background: #dcfce7; color: #166534; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-left: 8px; }
          .info-box { background: #f0fdf4; border-left: 4px solid #16a34a; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0; }
          .info-row { margin: 8px 0; }
          .label { font-weight: 600; color: #374151; }
          .value { color: #6b7280; }
          .btn { display: inline-block; background: #16a34a; color: white !important; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; margin-top: 20px; }
          .footer { text-align: center; margin-top: 24px; color: #9ca3af; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="header">
              <h1>📝 Nouvelle demande d'inscription <span class="verified-badge">✓ Email vérifié</span></h1>
            </div>
            <p>Une nouvelle demande de création de compte a été soumise sur CNAM.</p>
            
            <div class="info-box">
              <div class="info-row">
                <span class="label">Nom complet:</span>
                <span class="value">${safeFirstName} ${safeLastName}</span>
              </div>
              <div class="info-row">
                <span class="label">Email:</span>
                <span class="value">${safeEmail}</span>
              </div>
              ${safePhone ? `
              <div class="info-row">
                <span class="label">Téléphone:</span>
                <span class="value">${safePhone}</span>
              </div>
              ` : ''}
              ${safeMessage ? `
              <div class="info-row">
                <span class="label">Message:</span>
                <span class="value">${safeMessage}</span>
              </div>
              ` : ''}
            </div>
            
            <p>Veuillez vous connecter au tableau de bord pour examiner et approuver cette demande.</p>
            
            <center>
              <a href="${appUrl}/utilisateurs" class="btn">Voir les demandes</a>
            </center>
          </div>
          <div class="footer">
            <p>CNAM - Caisse Nationale d'Assurance Maladie</p>
            <p>Cet email a été envoyé automatiquement. Ne pas répondre.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    for (const adminEmail of adminEmails) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "CNAM <onboarding@resend.dev>",
            to: [adminEmail],
            subject: `📝 Nouvelle demande d'inscription (vérifiée) - ${safeFirstName} ${safeLastName}`,
            html: htmlContent,
          }),
        });
      } catch (e) {
        console.error(`Failed to notify admin ${adminEmail}:`, e);
      }
    }
  } catch (e) {
    console.error("Error notifying admins:", e);
  }
}

serve(handler);
